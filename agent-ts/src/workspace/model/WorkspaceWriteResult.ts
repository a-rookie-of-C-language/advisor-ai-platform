import type { JsonObject } from "../../common/json/JsonTypes.js";

export interface WorkspaceWriteResult extends JsonObject {
  path: string;
  size: number;
}
