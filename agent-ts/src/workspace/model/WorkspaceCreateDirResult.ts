import type { JsonObject } from "../../common/json/JsonTypes.js";

export interface WorkspaceCreateDirResult extends JsonObject {
  path: string;
  created: boolean;
}
