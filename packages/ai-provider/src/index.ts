import type { Finding, ProjectContext } from "@engineercheck/report-schema";

export type EvidenceExcerpt = {
  file: string;
  startLine: number;
  content: string;
};
export type AiAnalysisRequest = {
  context: ProjectContext;
  excerpts: EvidenceExcerpt[];
  deterministicFindings: Finding[];
};
export interface AiProvider {
  readonly name: string;
  readonly enabled: boolean;
  analyze(request: AiAnalysisRequest): Promise<Finding[]>;
}

export class DisabledAiProvider implements AiProvider {
  readonly name = "disabled";
  readonly enabled = false;
  async analyze(_request: AiAnalysisRequest): Promise<Finding[]> {
    return [];
  }
}

// Providers must redact excerpts, wrap repository text as untrusted data, minimize
// transmitted content, use structured output, validate findings locally, and reject
// serious findings without cited file/line evidence. No network adapter ships enabled.
