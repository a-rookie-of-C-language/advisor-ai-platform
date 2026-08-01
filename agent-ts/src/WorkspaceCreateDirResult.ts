import type { JsonObject } from "./common/JsonTypes.js";

export interface WorkspaceCreateDirResult extends JsonObject {
  path: string;
  created: boolean;
}
