import type { MemoryCandidateInput } from "../../input/MemoryCandidateInput.js";

export interface MemoryWriteRequest {
  userId: number;
  kbId: number;
  candidates: MemoryCandidateInput[];
}
