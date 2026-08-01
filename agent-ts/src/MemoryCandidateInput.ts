import type { JsonObject } from "./common/JsonTypes.js";

export interface MemoryCandidateInput {
  content: string;
  confidence?: number;
  sourceTurnId?: string | null;
  tags?: JsonObject | null;
  memoryType?: string | null;
  isCore?: boolean | null;
}
