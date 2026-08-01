import type { MemoryCandidateInput } from "./MemoryCandidateInput.js";

export interface MemoryCandidateUpsertRequest {
  userId: number;
  kbId: number;
  candidates: MemoryCandidateInput[];
}
