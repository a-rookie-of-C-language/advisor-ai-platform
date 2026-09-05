import type { JsonObject } from "../../common/json/types/JsonTypes.js";

export interface EvalCase {
  readonly id: string;
  readonly query: string;
  readonly expectedChunks: readonly string[];
  readonly tags: readonly string[];
  readonly expectedAnnotation?: JsonObject | null;
  readonly expectedAnswer?: string | null;
}
