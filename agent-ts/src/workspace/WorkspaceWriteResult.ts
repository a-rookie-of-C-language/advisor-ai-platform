import type { JsonObject } from "../common/JsonTypes.js";

export interface WorkspaceWriteResult extends JsonObject {
  path: string;
  size: number;
}
