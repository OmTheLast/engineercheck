import path from "node:path";
import type { ProjectContext, Report } from "@engineercheck/report-schema";
import { projectContextSchema } from "@engineercheck/report-schema";
import { inventoryRepository, detectStacks } from "./inventory.js";
import { executeRules } from "./rules.js";
import { createReport } from "./report.js";

export * from "./inventory.js";
export * from "./report.js";
export * from "./rules.js";

export async function scanRepository(
  root: string,
  contextInput: Partial<ProjectContext> = {},
): Promise<Report> {
  const absoluteRoot = path.resolve(root);
  const context = projectContextSchema.parse(contextInput);
  const inventory = await inventoryRepository(absoluteRoot);
  const stacks = detectStacks(inventory.files);
  const findings = executeRules(inventory, context);
  return createReport({
    root: absoluteRoot,
    name: path.basename(absoluteRoot),
    stacks,
    context,
    findings,
    inventory,
  });
}
