import type { JsonObject } from "./common/JsonTypes.js";

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: JsonObject;
  server: string;
}
