import type { MemoryItem } from "../model/MemoryItem.js";
import type { SessionSummary } from "../../common/session/SessionSummary.js";

export interface MemoryContextLoadResult {
  summary: SessionSummary | null;
  coreMemories: MemoryItem[];
  longTermMemories: MemoryItem[];
}
