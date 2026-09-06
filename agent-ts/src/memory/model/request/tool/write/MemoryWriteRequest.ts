import type { MemoryCandidateInput } from "../../../input/MemoryCandidateInput.js";

export interface MemoryWriteRequest {
  userId: number;
  knowledgeBaseId: number;
  candidates: MemoryCandidateInput[];
}
