#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { scanRepository, renderHtml } from "@engineercheck/analyzer";
import {
  projectContextSchema,
  type ProjectContext,
} from "@engineercheck/report-schema";
import { startDashboard } from "@engineercheck/dashboard";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
function yes(name: string): boolean {
  return process.argv.includes(name);
}
async function questionnaire(): Promise<Partial<ProjectContext>> {
  const rl = readline.createInterface({ input, output });
  console.log("Answer briefly; press Enter to accept the shown default.");
  const ask = async (q: string, d: string) => {
    const value = await rl.question(`${q} [${d}]: `);
    return value.trim() || d;
  };
  const yn = async (q: string) => /^y/i.test(await ask(q, "no"));
  const result = {
    productDescription: await ask("What does the product do?", "Not provided"),
    intendedUsers: await ask("Who uses it?", "Not provided"),
    visibility: (await ask(
      "Public, private, or unknown?",
      "unknown",
    )) as ProjectContext["visibility"],
    authenticationMethod: await ask("Authentication method?", "unknown"),
    sensitiveData: await yn("Stores personal or sensitive data?"),
    payments: await yn("Handles payments?"),
    fileUploads: await yn("Accepts file uploads?"),
    userGeneratedContent: await yn("Accepts user-generated content?"),
    adminRoles: await yn("Has admin roles?"),
    aiFeatures: await yn("Has AI features?"),
    expectedTraffic: await ask("Expected traffic?", "unknown"),
    deploymentProvider: await ask("Deployment provider?", "unknown"),
    databaseProvider: await ask("Database provider?", "unknown"),
    backupExpectations: await ask("Backup expectations?", "unknown"),
  };
  rl.close();
  return result;
}
async function scan(): Promise<void> {
  const target = process.argv[3];
  if (!target)
    throw new Error(
      "Usage: engineercheck scan <path> [--context file] [--output dir] [--format html,json] [--interactive] [--runtime-checks] [--ai]",
    );
  if (yes("--ai"))
    console.warn(
      "AI analysis is disabled in this MVP build; the deterministic local analyzer will be used. No repository content will be uploaded.",
    );
  if (yes("--runtime-checks"))
    console.warn(
      "Runtime checks requested. No runtime command profile is configured, so no repository commands will run. Default static analysis continues.",
    );
  let context: Partial<ProjectContext> = {};
  const contextFile = option("--context");
  if (contextFile)
    context = projectContextSchema.parse(
      JSON.parse(await readFile(path.resolve(contextFile), "utf8")),
    );
  else if (yes("--interactive")) context = await questionnaire();
  const report = await scanRepository(target, context);
  const outputDirectory = path.resolve(
    option("--output") ?? "engineercheck-report",
  );
  const formats = (option("--format") ?? "html,json").split(",");
  await mkdir(outputDirectory, { recursive: true });
  if (formats.includes("json"))
    await writeFile(
      path.join(outputDirectory, "report.json"),
      JSON.stringify(report, null, 2),
    );
  if (formats.includes("html"))
    await writeFile(
      path.join(outputDirectory, "report.html"),
      renderHtml(report),
    );
  const history = path.resolve(".engineercheck/reports");
  await mkdir(history, { recursive: true });
  await writeFile(
    path.join(history, `${report.scanId}.json`),
    JSON.stringify(report, null, 2),
  );
  console.log(
    `${report.recommendation}\n${report.findings.length} findings; ${report.releaseBlockers.length} release blockers\nReport: ${outputDirectory}`,
  );
}
async function main() {
  const command = process.argv[2];
  if (command === "scan") await scan();
  else if (command === "dashboard") {
    const reportsDirectory = option("--reports");
    await startDashboard({
      ...(reportsDirectory ? { reportsDirectory } : {}),
      port: Number(option("--port") ?? 4173),
    });
  } else
    console.log(
      "EngineerCheck 0.1\nCommands: scan <path>, dashboard [--reports dir] [--port 4173]",
    );
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
