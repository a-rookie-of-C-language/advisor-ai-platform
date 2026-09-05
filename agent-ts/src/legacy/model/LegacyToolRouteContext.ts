import type { JsonObject } from "../../common/json/types/JsonTypes.js";

export interface LegacyToolRouteContext {
  readonly matchedTools: readonly string[];
  readonly routeCategories: readonly string[];
  readonly taskPlan: JsonObject;
  readonly events: readonly string[];
}
