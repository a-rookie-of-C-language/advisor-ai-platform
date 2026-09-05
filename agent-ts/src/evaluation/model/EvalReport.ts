import type { JsonObject } from "../../common/json/types/JsonTypes.js";

export interface EvalReport {
  readonly meta: JsonObject;
  summary: JsonObject;
  cases: JsonObject[];
}
