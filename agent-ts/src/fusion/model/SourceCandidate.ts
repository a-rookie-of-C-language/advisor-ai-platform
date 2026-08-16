import type { JsonObject } from "../../common/json/types/JsonObject.js";

export interface SourceCandidate {
  readonly content: string;
  readonly source: "rag" | "web" | "user_context";
  readonly score: number;
  readonly metadata: JsonObject;
}
