import type { JsonObject } from "./JsonTypes.js";

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: JsonObject;
  server: string;
}
