import type { SourceCandidate } from "./SourceCandidate.js";

export interface FusionResult {
  readonly candidates: readonly SourceCandidate[];
  readonly scene: string;
  readonly conflictHint?: string;
}
