import { z } from "zod";

export const severitySchema = z.enum([
  "blocker",
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
export type Severity = z.infer<typeof severitySchema>;

export const evidenceSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  excerpt: z.string(),
  rationale: z.string(),
});

export const findingSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  title: z.string(),
  category: z.string(),
  severity: severitySchema,
  confidence: z.enum(["high", "medium", "low"]),
  status: z.enum(["open", "needs-human-verification", "accepted", "fixed"]),
  summary: z.string(),
  technicalExplanation: z.string(),
  userImpact: z.string(),
  failureScenario: z.string(),
  evidence: z.array(evidenceSchema),
  affectedFiles: z.array(z.string()),
  remediation: z.array(z.string()),
  verificationSteps: z.array(z.string()),
  releaseBlocking: z.boolean(),
  limitations: z.array(z.string()),
});
export type Finding = z.infer<typeof findingSchema>;

export const projectContextSchema = z.object({
  productDescription: z.string().default("Not provided"),
  intendedUsers: z.string().default("Not provided"),
  visibility: z.enum(["public", "private", "unknown"]).default("unknown"),
  authenticationMethod: z.string().default("unknown"),
  dataTypes: z.array(z.string()).default([]),
  sensitiveData: z.boolean().default(false),
  payments: z.boolean().default(false),
  fileUploads: z.boolean().default(false),
  userGeneratedContent: z.boolean().default(false),
  adminRoles: z.boolean().default(false),
  externalApis: z.array(z.string()).default([]),
  aiFeatures: z.boolean().default(false),
  expectedTraffic: z.string().default("unknown"),
  deploymentProvider: z.string().default("unknown"),
  databaseProvider: z.string().default("unknown"),
  backupExpectations: z.string().default("unknown"),
});
export type ProjectContext = z.infer<typeof projectContextSchema>;

export const reportSchema = z.object({
  schemaVersion: z.literal("0.1"),
  standardVersion: z.literal("0.1"),
  scanId: z.string(),
  generatedAt: z.string(),
  project: z.object({
    name: z.string(),
    root: z.string(),
    stacks: z.array(z.string()),
  }),
  context: projectContextSchema,
  recommendation: z.enum([
    "Do not ship",
    "Ship after fixes",
    "Acceptable for limited release",
    "Ready based on available evidence",
  ]),
  findings: z.array(findingSchema),
  releaseBlockers: z.array(z.string()),
  highestRiskFlows: z.array(z.string()),
  unknowns: z.array(z.string()),
  strengths: z.array(z.string()),
  remediationPlan: z.array(z.string()),
  categoryScores: z.record(z.string(), z.number().min(0).max(100)),
  limitations: z.array(z.string()),
  inventory: z.object({
    filesScanned: z.number(),
    filesSkipped: z.number(),
    bytesRead: z.number(),
  }),
});
export type Report = z.infer<typeof reportSchema>;
