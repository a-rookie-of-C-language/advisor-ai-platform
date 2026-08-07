import type { SessionSummary } from "../../../common/session/SessionSummary.js";
import type { MemoryItem } from "../../model/MemoryItem.js";

export interface MemoryContextLoadResult {
  summary: SessionSummary | null;
  coreMemories: MemoryItem[];
  longTermMemories: MemoryItem[];
}
