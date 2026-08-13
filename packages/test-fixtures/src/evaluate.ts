import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepository } from "@engineercheck/analyzer";

type Expected = {
  expected: Array<{ ruleId: string; severity: string }>;
  nonFindings: string[];
};
const fixtureRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
);
const names = (await readdir(fixtureRoot, { withFileTypes: true }))
  .filter((x) => x.isDirectory())
  .map((x) => x.name);
let expectedSerious = 0,
  detectedSerious = 0,
  severityMatches = 0,
  evidenceValid = 0,
  unexpected = 0,
  total = 0,
  duplicates = 0;
const perRule = new Map<string, { expected: number; detected: number }>();
for (const name of names) {
  const root = path.join(fixtureRoot, name);
  const truth = JSON.parse(
    await readFile(path.join(root, "ground-truth.json"), "utf8"),
  ) as Expected;
  const report = await scanRepository(root, {
    fileUploads: name === "unsafe-upload",
  });
  const keys = new Set<string>();
  for (const finding of report.findings) {
    total++;
    const key = `${finding.ruleId}:${finding.affectedFiles.join(",")}:${finding.summary}`;
    if (keys.has(key)) duplicates++;
    keys.add(key);
    if (
      finding.evidence.every(
        (e) =>
          e.file && e.line > 0 && !e.excerpt.includes("test-secret-value-123"),
      )
    )
      evidenceValid++;
    if (truth.nonFindings.includes(finding.ruleId)) unexpected++;
  }
  for (const item of truth.expected) {
    const serious = ["blocker", "critical", "high"].includes(item.severity);
    if (serious) expectedSerious++;
    const match = report.findings.find((x) => x.ruleId === item.ruleId);
    const stat = perRule.get(item.ruleId) ?? { expected: 0, detected: 0 };
    stat.expected++;
    if (match) {
      stat.detected++;
      if (serious) detectedSerious++;
      if (match.severity === item.severity) severityMatches++;
    }
    perRule.set(item.ruleId, stat);
  }
}
console.log(
  JSON.stringify(
    {
      fixtures: names.length,
      expectedSeriousDetected: `${detectedSerious}/${expectedSerious}`,
      missedSerious: expectedSerious - detectedSerious,
      unexpectedFindings: unexpected,
      severityAgreement: Number(
        (
          (severityMatches /
            [...perRule.values()].reduce((n, x) => n + x.expected, 0)) *
          100
        ).toFixed(1),
      ),
      evidenceValidity: Number(
        ((evidenceValid / Math.max(total, 1)) * 100).toFixed(1),
      ),
      duplicateRate: Number(
        ((duplicates / Math.max(total, 1)) * 100).toFixed(1),
      ),
      perRule: Object.fromEntries(perRule),
    },
    null,
    2,
  ),
);
if (
  detectedSerious < expectedSerious ||
  unexpected > 0 ||
  evidenceValid < total ||
  duplicates > 0
)
  process.exitCode = 1;
