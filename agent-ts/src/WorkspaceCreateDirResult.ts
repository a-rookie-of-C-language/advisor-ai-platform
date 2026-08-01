import type { JsonObject } from "./JsonTypes.js";

export interface WorkspaceCreateDirResult extends JsonObject {
  path: string;
  created: boolean;
}
