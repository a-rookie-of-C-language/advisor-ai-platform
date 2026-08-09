import type { JsonObject } from "../../../../../common/json/types/JsonTypes.js";

export interface WorkspaceCreateDirResult extends JsonObject {
  path: string;
  created: boolean;
}
