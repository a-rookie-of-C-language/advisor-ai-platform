import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: JsonObject;
  server: string;
}
