import type { JsonObject } from "./JsonTypes.js";

export interface WorkspaceEditResult extends JsonObject {
  path: string;
  replaced: boolean;
}
