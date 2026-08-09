import type { JsonObject } from "../../../../../../common/json/types/JsonTypes.js";

export interface WorkspaceEditResult extends JsonObject {
  path: string;
  replaced: boolean;
}
