import type { JsonObject } from "./JsonTypes.js";

export interface WorkspaceWriteResult extends JsonObject {
  path: string;
  size: number;
}
