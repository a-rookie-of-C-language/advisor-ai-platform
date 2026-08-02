import type { MemoryCandidateInput } from "./MemoryCandidateInput.js";

export interface MemoryWriteRequest {
  userId: number;
  kbId: number;
  candidates: MemoryCandidateInput[];
}
