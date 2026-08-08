import type { JsonObject } from "../../../../../common/json/JsonTypes.js";

export interface WorkspaceEditResult extends JsonObject {
  path: string;
  replaced: boolean;
}
