import type { MemoryItem } from "./MemoryItem.js";
import type { SessionSummary } from "../common/SessionSummary.js";

export interface MemoryContextLoadResult {
  summary: SessionSummary | null;
  coreMemories: MemoryItem[];
  longTermMemories: MemoryItem[];
}
