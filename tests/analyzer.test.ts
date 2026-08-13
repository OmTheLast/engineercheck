import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reportSchema } from "@engineercheck/report-schema";
import { renderHtml, scanRepository } from "@engineercheck/analyzer";
const fixtures = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../packages/test-fixtures/fixtures",
);
describe("scan pipeline", () => {
  it("produces a schema-valid authorization finding with line evidence", async () => {
    const report = await scanRepository(
      path.join(fixtures, "authorization-failure"),
    );
    expect(() => reportSchema.parse(report)).not.toThrow();
    const finding = report.findings.find((x) => x.ruleId === "EC-AUTHZ-001");
    expect(finding?.severity).toBe("high");
    expect(finding?.evidence[0]?.line).toBeGreaterThan(0);
  });
  it("redacts secret values in JSON and HTML", async () => {
    const report = await scanRepository(path.join(fixtures, "unsafe-secrets"));
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("test-secret-value-123");
    expect(renderHtml(report)).not.toContain("test-secret-value-123");
  });
  it("keeps the constructed fixture free of expected false positives", async () => {
    const report = await scanRepository(
      path.join(fixtures, "well-constructed"),
    );
    expect(
      report.findings.filter((x) =>
        ["EC-SECRET-001", "EC-AUTHZ-001", "EC-INPUT-001"].includes(x.ruleId),
      ),
    ).toEqual([]);
  });
  it("completes the scan-to-JSON-and-HTML report workflow", async () => {
    const output = await mkdtemp(path.join(tmpdir(), "engineercheck-e2e-"));
    const report = await scanRepository(path.join(fixtures, "unsafe-webhook"));
    await writeFile(path.join(output, "report.json"), JSON.stringify(report));
    await writeFile(path.join(output, "report.html"), renderHtml(report));
    expect(
      reportSchema.parse(
        JSON.parse(await readFile(path.join(output, "report.json"), "utf8")),
      ).recommendation,
    ).toBe("Ship after fixes");
    expect(await readFile(path.join(output, "report.html"), "utf8")).toContain(
      "No repository code was executed",
    );
  });
});
