import type { JsonObject } from "../common/JsonTypes.js";

export interface WorkspaceEditResult extends JsonObject {
  path: string;
  replaced: boolean;
}
