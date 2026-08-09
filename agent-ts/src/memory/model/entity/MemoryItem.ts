import type { JsonObject } from "../../../common/json/types/JsonTypes.js";

export interface MemoryItem {
  id?: number;
  userId?: number;
  kbId?: number;
  content: string;
  confidence?: number;
  score?: number;
  tags?: JsonObject | null;
  memoryType?: string | null;
  isCore?: boolean | null;
}
