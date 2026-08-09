import type { JsonObject } from "../../../../../../common/json/types/JsonTypes.js";

export interface WorkspaceWriteResult extends JsonObject {
  path: string;
  size: number;
}
