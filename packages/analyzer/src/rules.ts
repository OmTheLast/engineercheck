import { createHash } from "node:crypto";
import type {
  Finding,
  ProjectContext,
  Severity,
} from "@engineercheck/report-schema";
import { rulesById } from "@engineercheck/standards";
import type { Inventory, SourceFile } from "./inventory.js";

type Candidate = {
  ruleId: string;
  severity: Severity;
  confidence: "high" | "medium" | "low";
  file: SourceFile;
  line: number;
  excerpt: string;
  summary: string;
  rationale: string;
  limitations?: string[];
};
const secretAssignment =
  /\b(api[_-]?key|secret|token|password|private[_-]?key)\b\s*[:=]\s*["']?([^\s"']{8,})/i;
const routePattern = /(^|\/)(api|routes?)\/|route\.(ts|js)$|pages\/api\//;

function redact(text: string): string {
  return text
    .replace(/(sk-[A-Za-z0-9_-]{8})[A-Za-z0-9_-]+/g, "$1…[REDACTED]")
    .replace(
      /((?:secret|token|password|key)\s*[:=]\s*["']?)[^\s"']{4,}/gi,
      "$1[REDACTED]",
    );
}

function makeFinding(candidate: Candidate): Finding {
  const standard = rulesById.get(candidate.ruleId);
  if (!standard) throw new Error(`Unknown rule ${candidate.ruleId}`);
  const serious = ["blocker", "critical", "high"].includes(candidate.severity);
  const id = createHash("sha256")
    .update(`${candidate.ruleId}:${candidate.file.path}:${candidate.line}`)
    .digest("hex")
    .slice(0, 16);
  return {
    id,
    ruleId: candidate.ruleId,
    title: standard.title,
    category: standard.category,
    severity: candidate.severity,
    confidence: candidate.confidence,
    status:
      candidate.confidence === "low" ? "needs-human-verification" : "open",
    summary: candidate.summary,
    technicalExplanation: standard.explanation,
    userImpact: serious
      ? "A user could lose access, privacy, data integrity, or trust if this path fails."
      : "This can make the product harder to operate or use reliably.",
    failureScenario: candidate.rationale,
    evidence: [
      {
        file: candidate.file.path,
        line: candidate.line,
        excerpt: redact(candidate.excerpt.trim()).slice(0, 300),
        rationale: candidate.rationale,
      },
    ],
    affectedFiles: [candidate.file.path],
    remediation: standard.remediation,
    verificationSteps: standard.verification,
    releaseBlocking: serious && candidate.confidence !== "low",
    limitations: candidate.limitations ?? [
      "Static analysis cannot observe runtime middleware, infrastructure policy, or deployed configuration.",
    ],
  };
}

function candidatesForFile(
  file: SourceFile,
  context: ProjectContext,
): Candidate[] {
  const output: Candidate[] = [];
  const add = (
    line: number,
    data: Omit<Candidate, "file" | "line" | "excerpt">,
  ) =>
    output.push({ ...data, file, line, excerpt: file.lines[line - 1] ?? "" });
  if (/^\.env($|\.)/.test(file.path) && !/\.example$/.test(file.path))
    add(1, {
      ruleId: "EC-SECRET-001",
      severity: "high",
      confidence: "high",
      summary: "An environment file is present in the repository tree.",
      rationale:
        "Environment files frequently contain deployable credentials and should not be committed.",
    });
  file.lines.forEach((line, index) => {
    const n = index + 1;
    if (
      secretAssignment.test(line) &&
      !/process\.env|import\.meta\.env|example|placeholder|changeme/i.test(line)
    )
      add(n, {
        ruleId: "EC-SECRET-001",
        severity: "high",
        confidence: "medium",
        summary: "A secret-like value appears hardcoded.",
        rationale:
          "The variable name and assigned value resemble a credential. The value is redacted and must be rotated if genuine.",
      });
    if (
      /\b(NEXT_PUBLIC|VITE|REACT_APP)_[A-Z0-9_]*(SECRET|PRIVATE|TOKEN|PASSWORD|SERVICE_ROLE|API_KEY)/.test(
        line,
      )
    )
      add(n, {
        ruleId: "EC-SECRET-001",
        severity: "high",
        confidence: "high",
        summary: "A sensitive-looking variable uses a client-public prefix.",
        rationale:
          "This prefix typically embeds the value in browser-delivered code.",
      });
    if (
      /dangerouslySetInnerHTML|\.innerHTML\s*=/.test(line) &&
      !/sanitize|DOMPurify/.test(file.content)
    )
      add(n, {
        ruleId: "EC-INPUT-001",
        severity: "high",
        confidence: "medium",
        summary: "HTML is inserted without a visible sanitizer.",
        rationale:
          "Attacker-controlled markup could execute script in another user’s browser.",
      });
    if (
      /catch\s*\([^)]*\)\s*\{\s*\}/.test(line) ||
      /catch\s*\{\s*\}/.test(line)
    )
      add(n, {
        ruleId: "EC-ERROR-001",
        severity: "medium",
        confidence: "high",
        summary: "An empty catch block silently discards a failure.",
        rationale:
          "The operation can fail without logs, user feedback, or a compensating action.",
      });
    if (
      /fetch\s*\(/.test(line) &&
      !/AbortSignal|signal\s*:|timeout/i.test(file.content)
    )
      add(n, {
        ruleId: "EC-PERF-001",
        severity: "medium",
        confidence: "medium",
        summary: "An external call has no visible timeout or cancellation.",
        rationale:
          "A stalled dependency can hold resources and delay every caller.",
        limitations: [
          "A wrapper or platform timeout may exist outside this file.",
        ],
      });
    if (/<img\b/.test(line) && !/\balt\s*=/.test(line))
      add(n, {
        ruleId: "EC-A11Y-001",
        severity: "low",
        confidence: "high",
        summary: "An image has no alt attribute.",
        rationale:
          "Screen-reader users may receive no useful description or indication that the image is decorative.",
      });
    if (
      /<div[^>]+onClick=|<span[^>]+onClick=/.test(line) &&
      !/role=|tabIndex=|onKey/.test(line)
    )
      add(n, {
        ruleId: "EC-A11Y-001",
        severity: "medium",
        confidence: "medium",
        summary: "A non-semantic element is used as a click control.",
        rationale:
          "Keyboard and assistive-technology users may be unable to operate it.",
      });
    if (/ignoreBuildErrors\s*:\s*true|ignoreDuringBuilds\s*:\s*true/.test(line))
      add(n, {
        ruleId: "EC-DEPLOY-001",
        severity: "high",
        confidence: "high",
        summary:
          "Production builds are configured to ignore correctness errors.",
        rationale: "Known type or lint failures can reach production.",
      });
    if (
      /select\s*\(\s*['"]\*['"]\s*\)|\.findMany\s*\(\s*\{?\s*\}?\s*\)/.test(
        line,
      ) &&
      !/limit|range|take|pagination/i.test(file.content)
    )
      add(n, {
        ruleId: "EC-PERF-001",
        severity: "medium",
        confidence: "medium",
        summary: "A list query appears unbounded.",
        rationale:
          "Data growth can turn this request into a memory, latency, and cost problem.",
      });
  });
  if (routePattern.test(file.path)) {
    const bodyLine = file.lines.findIndex((line) =>
      /request\.json\(|req\.body|request\.formData\(/.test(line),
    );
    if (
      bodyLine >= 0 &&
      !/zod|safeParse|\.parse\(|joi|yup|valibot|validator/i.test(file.content)
    )
      add(bodyLine + 1, {
        ruleId: "EC-INPUT-001",
        severity: "medium",
        confidence: "medium",
        summary:
          "An API endpoint consumes input without visible schema validation.",
        rationale:
          "Malformed or unexpected fields may reach persistence or privileged operations.",
      });
    const idLine = file.lines.findIndex((line) =>
      /params\.id|searchParams.*(id|userId)|\.eq\(\s*['"]id/.test(line),
    );
    if (
      idLine >= 0 &&
      !/user_id|owner_id|auth\.uid|session\.user|currentUser|authorize|ownership/i.test(
        file.content,
      )
    )
      add(idLine + 1, {
        ruleId: "EC-AUTHZ-001",
        severity: "high",
        confidence: "medium",
        summary:
          "A dynamic resource lookup lacks visible ownership enforcement.",
        rationale:
          "An authenticated caller may be able to substitute another record identifier.",
        limitations: [
          "Database row-level security or shared authorization middleware may enforce ownership; verify it before release.",
        ],
      });
    if (/webhook/i.test(file.path + file.content)) {
      const line = Math.max(
        1,
        file.lines.findIndex((item) => /POST|handler|webhook/i.test(item)) + 1,
      );
      if (
        !/signature|constructEvent|verifyWebhook|hmac|svix/i.test(file.content)
      )
        add(line, {
          ruleId: "EC-ASYNC-001",
          severity: "high",
          confidence: "high",
          summary: "A webhook endpoint has no visible signature verification.",
          rationale:
            "An attacker could forge events and trigger trusted side effects.",
        });
      if (!/idempot|event[_-]?id|upsert|unique/i.test(file.content))
        add(line, {
          ruleId: "EC-ASYNC-001",
          severity: "high",
          confidence: "medium",
          summary: "Webhook processing has no visible idempotency control.",
          rationale:
            "Provider retries can apply the same side effect multiple times.",
        });
    }
    if (
      (context.fileUploads || /upload/i.test(file.path)) &&
      /upload|formData|File\b/i.test(file.content) &&
      !/size\s*[<>]|MAX_.*SIZE|mime|contentType|allowedTypes/i.test(
        file.content,
      )
    )
      add(Math.max(1, bodyLine + 1), {
        ruleId: "EC-UPLOAD-001",
        severity: "high",
        confidence: "medium",
        summary: "A file-upload path lacks visible type or size controls.",
        rationale:
          "Oversized or executable content could be stored, served, or exhaust resources.",
      });
    if (
      /(login|signup|reset|ai|generate|email)/i.test(file.path) &&
      !/rateLimit|ratelimit|limiter|upstash/i.test(file.content)
    )
      add(1, {
        ruleId: "EC-ABUSE-001",
        severity: "medium",
        confidence: "low",
        summary:
          "A sensitive or expensive endpoint has no local rate-limit evidence.",
        rationale:
          "Automated abuse could increase cost or enable credential attacks.",
        limitations: [
          "Rate limiting may be configured at a gateway or hosting layer. Needs human verification.",
        ],
      });
  }
  if (
    /firestore\.rules$|storage\.rules$/.test(file.path) &&
    /allow\s+(read|write)[^;]*:\s*if\s+true/.test(file.content)
  )
    add(
      Math.max(1, file.lines.findIndex((line) => /if\s+true/.test(line)) + 1),
      {
        ruleId: "EC-AUTHZ-001",
        severity: "critical",
        confidence: "high",
        summary: "Firebase rules grant unconditional access.",
        rationale: "Any caller may read or modify protected data.",
      },
    );
  if (
    /\.sql$/.test(file.path) &&
    /create table/i.test(file.content) &&
    !/(primary key|unique|foreign key|references|check\s*\()/i.test(
      file.content,
    )
  )
    add(1, {
      ruleId: "EC-DATA-001",
      severity: "medium",
      confidence: "medium",
      summary:
        "A table migration has no visible relational or invariant constraints.",
      rationale:
        "Invalid or duplicate states may be accepted by every write path.",
    });
  return output;
}

export function executeRules(
  inventory: Inventory,
  context: ProjectContext,
): Finding[] {
  const candidates = inventory.files.flatMap((file) =>
    candidatesForFile(file, context),
  );
  const envConsumer = inventory.files.find((file) =>
    /process\.env\.[A-Z0-9_]+|import\.meta\.env\.[A-Z0-9_]+/.test(file.content),
  );
  const hasEnvExample = inventory.files.some((file) =>
    /(^|\/)\.env\.(example|sample)$/.test(file.path),
  );
  if (envConsumer && !hasEnvExample)
    candidates.push({
      ruleId: "EC-SECRET-001",
      severity: "medium",
      confidence: "high",
      file: envConsumer,
      line: Math.max(
        1,
        envConsumer.lines.findIndex((line) =>
          /process\.env|import\.meta\.env/.test(line),
        ) + 1,
      ),
      excerpt:
        envConsumer.lines.find((line) =>
          /process\.env|import\.meta\.env/.test(line),
        ) ?? "",
      summary:
        "Environment variables are used without a checked-in example file.",
      rationale:
        "Deployers may guess required configuration, omit values, or copy real credentials into unsafe locations.",
    });
  const route = inventory.files.find((file) => routePattern.test(file.path));
  const hasTests = inventory.files.some((file) =>
    /\.(test|spec)\.[jt]sx?$/.test(file.path),
  );
  if (route && !hasTests)
    candidates.push({
      ruleId: "EC-TEST-001",
      severity: "medium",
      confidence: "low",
      file: route,
      line: 1,
      excerpt: route.lines[0] ?? "",
      summary: "Application routes exist without visible automated tests.",
      rationale:
        "Critical request behavior may regress without a repeatable release check.",
      limitations: [
        "Tests may live in another repository or use an unrecognized filename. Needs human verification.",
      ],
    });
  for (const test of inventory.files.filter((file) =>
    /\.(test|spec)\.[jt]sx?$/.test(file.path),
  )) {
    const line = test.lines.findIndex((item) =>
      /\b(it|test)\.(skip|todo)\b|expect\(true\)\.toBe\(true\)/.test(item),
    );
    if (line >= 0)
      candidates.push({
        ruleId: "EC-TEST-001",
        severity: "medium",
        confidence: "high",
        file: test,
        line: line + 1,
        excerpt: test.lines[line] ?? "",
        summary:
          "A test is skipped, marked TODO, or only asserts a placeholder.",
        rationale:
          "The suite can appear green without verifying the intended behavior.",
      });
  }
  const databaseAnchor = inventory.files.find((file) =>
    /supabase|firebase|prisma|drizzle/i.test(file.path + file.content),
  );
  const hasMigrations = inventory.files.some(
    (file) =>
      /(migrations?|schema)\//i.test(file.path) ||
      /schema\.prisma$/.test(file.path),
  );
  if (databaseAnchor && !hasMigrations)
    candidates.push({
      ruleId: "EC-OPS-001",
      severity: "medium",
      confidence: "low",
      file: databaseAnchor,
      line: 1,
      excerpt: databaseAnchor.lines[0] ?? "",
      summary: "A database dependency is present without visible migrations.",
      rationale:
        "Production schema changes may be manual, irreproducible, or difficult to roll back.",
      limitations: [
        "Migrations may be managed in another repository or hosted console. Needs human verification.",
      ],
    });
  const operationsRelevant =
    Boolean(databaseAnchor) || context.databaseProvider !== "unknown";
  const operationsText = inventory.files
    .filter((file) => /\.md$/i.test(file.path))
    .map((file) => file.content)
    .join("\n");
  if (operationsRelevant && route && !/(backup|restore)/i.test(operationsText))
    candidates.push({
      ruleId: "EC-OPS-001",
      severity: "medium",
      confidence: "low",
      file: route,
      line: 1,
      excerpt: route.lines[0] ?? "",
      summary: "No backup and restore guidance is visible.",
      rationale:
        "A data-loss incident may become permanent if restoration is undocumented or untested.",
      limitations: [
        "Provider-managed backups may exist outside the repository. Needs human verification.",
      ],
    });
  if (
    route &&
    !/(health|structured log|logger|observability|monitoring)/i.test(
      inventory.files.map((file) => file.path + "\n" + file.content).join("\n"),
    )
  )
    candidates.push({
      ruleId: "EC-OBS-001",
      severity: "medium",
      confidence: "low",
      file: route,
      line: 1,
      excerpt: route.lines[0] ?? "",
      summary:
        "No health-check or structured operational logging evidence is visible.",
      rationale:
        "Operators may learn about failures from users and lack safe diagnostic context.",
      limitations: [
        "Hosting-provider telemetry may exist outside the repository. Needs human verification.",
      ],
    });
  const deduped = new Map<string, Finding>();
  for (const candidate of candidates) {
    const finding = makeFinding(candidate);
    const key = `${finding.ruleId}:${finding.affectedFiles[0]}:${finding.summary}`;
    if (!deduped.has(key)) deduped.set(key, finding);
  }
  return [...deduped.values()];
}
