import type {
  Finding,
  ProjectContext,
  Report,
  Severity,
} from "@engineercheck/report-schema";
import { reportSchema } from "@engineercheck/report-schema";
import type { Inventory } from "./inventory.js";

const weight: Record<Severity, number> = {
  blocker: 40,
  critical: 35,
  high: 25,
  medium: 12,
  low: 5,
  info: 1,
};
const htmlEscape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );

export function createReport(args: {
  root: string;
  name: string;
  stacks: string[];
  context: ProjectContext;
  findings: Finding[];
  inventory: Inventory;
}): Report {
  const blockers = args.findings.filter((item) => item.releaseBlocking);
  const critical = args.findings.some(
    (item) =>
      ["blocker", "critical"].includes(item.severity) &&
      item.confidence !== "low",
  );
  const high = args.findings.some(
    (item) => item.severity === "high" && item.confidence !== "low",
  );
  const recommendation = critical
    ? "Do not ship"
    : high
      ? "Ship after fixes"
      : args.findings.some((item) => item.severity === "medium")
        ? "Acceptable for limited release"
        : "Ready based on available evidence";
  const categories = new Map<string, number>();
  for (const finding of args.findings)
    categories.set(
      finding.category,
      (categories.get(finding.category) ?? 100) - weight[finding.severity],
    );
  const hasTests = args.inventory.files.some((file) =>
    /\.(test|spec)\.[jt]sx?$/.test(file.path),
  );
  const hasReadme = args.inventory.files.some((file) =>
    /^readme\.md$/i.test(file.path),
  );
  const unknowns = args.findings
    .filter((item) => item.status === "needs-human-verification")
    .map((item) => item.summary);
  if (args.context.authenticationMethod === "unknown")
    unknowns.push("Authentication and session model were not provided.");
  if (args.context.backupExpectations === "unknown")
    unknowns.push("Backup and restore expectations were not provided.");
  return reportSchema.parse({
    schemaVersion: "0.1",
    standardVersion: "0.1",
    scanId: `scan-${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
    project: { name: args.name, root: args.root, stacks: args.stacks },
    context: args.context,
    recommendation,
    findings: args.findings,
    releaseBlockers: blockers.map((item) => item.id),
    highestRiskFlows: args.findings
      .filter((item) => ["critical", "high"].includes(item.severity))
      .slice(0, 5)
      .map((item) => item.summary),
    unknowns: [...new Set(unknowns)],
    strengths: [
      ...(hasTests ? ["Automated test files are present."] : []),
      ...(hasReadme ? ["Project setup documentation is present."] : []),
      ...(args.stacks.includes("TypeScript")
        ? ["TypeScript provides a foundation for static correctness checks."]
        : []),
    ],
    remediationPlan: args.findings
      .filter((item) => item.severity !== "info")
      .sort((a, b) => weight[b.severity] - weight[a.severity])
      .slice(0, 8)
      .map(
        (item) =>
          `${item.severity.toUpperCase()}: ${item.remediation[0] ?? item.title}`,
      ),
    categoryScores: Object.fromEntries(
      [...categories].map(([key, value]) => [key, Math.max(0, value)]),
    ),
    limitations: [
      "Static evidence cannot prove deployed behavior, infrastructure controls, or that every runtime path is safe.",
      "Dependency vulnerability audits and runtime commands are not executed by default.",
      "Unsupported stacks receive only generic source checks.",
    ],
    inventory: {
      filesScanned: args.inventory.files.length,
      filesSkipped: args.inventory.filesSkipped,
      bytesRead: args.inventory.bytesRead,
    },
  });
}

export function renderHtml(report: Report): string {
  const findings = report.findings
    .map(
      (finding) =>
        `<article class="finding" data-severity="${finding.severity}"><div class="eyebrow"><span class="pill ${finding.severity}">${finding.severity}</span><span>${htmlEscape(finding.category)}</span><span>${finding.confidence} confidence</span></div><h3>${htmlEscape(finding.title)}</h3><p>${htmlEscape(finding.summary)}</p><details><summary>Evidence and fix</summary>${finding.evidence.map((e) => `<pre><b>${htmlEscape(e.file)}:${e.line}</b>\n${htmlEscape(e.excerpt)}</pre>`).join("")}<h4>What can go wrong</h4><p>${htmlEscape(finding.failureScenario)}</p><h4>Remediation</h4><ol>${finding.remediation.map((x) => `<li>${htmlEscape(x)}</li>`).join("")}</ol><h4>Verify</h4><ol>${finding.verificationSteps.map((x) => `<li>${htmlEscape(x)}</li>`).join("")}</ol></details></article>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>EngineerCheck — ${htmlEscape(report.project.name)}</title><style>:root{font-family:Inter,ui-sans-serif,system-ui;color:#18211b;background:#f2f4ee}*{box-sizing:border-box}body{margin:0}.shell{max-width:1120px;margin:auto;padding:32px}.hero{background:#17251d;color:#f7f5eb;padding:34px;border-radius:20px;box-shadow:0 12px 40px #17251d22}.kicker,.eyebrow{display:flex;gap:10px;align-items:center;text-transform:uppercase;letter-spacing:.08em;font-size:12px}.recommendation{font-size:42px;line-height:1.05;margin:16px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0}.card,.finding{background:white;border:1px solid #dce1d8;border-radius:14px;padding:20px}.finding{margin:12px 0}.finding h3{margin:10px 0 5px}.pill{padding:4px 8px;border-radius:99px;background:#e8ebe5;font-weight:700}.critical,.blocker{background:#ffd8d1;color:#8e2215}.high{background:#ffe5bd;color:#7a4300}.medium{background:#fff0af;color:#645000}.low,.info{background:#dcebe6;color:#245348}pre{white-space:pre-wrap;background:#f4f5f1;padding:14px;border-radius:8px;overflow:auto}summary{cursor:pointer;font-weight:700}@media(max-width:700px){.grid{grid-template-columns:1fr}.shell{padding:16px}.recommendation{font-size:32px}}</style></head><body><main class="shell"><section class="hero"><div class="kicker">EngineerCheck · Standard ${report.standardVersion}</div><h1 class="recommendation">${report.recommendation}</h1><p>${report.findings.length} findings from ${report.inventory.filesScanned} statically inspected files. No repository code was executed.</p></section><section class="grid"><div class="card"><b>Release blockers</b><div class="recommendation">${report.releaseBlockers.length}</div></div><div class="card"><b>Unknowns</b><div class="recommendation">${report.unknowns.length}</div></div><div class="card"><b>Stacks</b><p>${report.project.stacks.map(htmlEscape).join(" · ") || "Limited detection"}</p></div></section><h2>Prioritized plan</h2><div class="card"><ol>${report.remediationPlan.map((x) => `<li>${htmlEscape(x)}</li>`).join("")}</ol></div><h2>Findings</h2>${findings || '<div class="card">No deterministic findings. This is not proof that the project is defect-free.</div>'}<h2>Unknowns and limitations</h2><div class="card"><ul>${[...report.unknowns, ...report.limitations].map((x) => `<li>${htmlEscape(x)}</li>`).join("")}</ul></div><h2>Engineering strengths</h2><div class="card"><ul>${report.strengths.map((x) => `<li>${htmlEscape(x)}</li>`).join("") || "<li>No strength evidence was detected automatically.</li>"}</ul></div></main></body></html>`;
}
