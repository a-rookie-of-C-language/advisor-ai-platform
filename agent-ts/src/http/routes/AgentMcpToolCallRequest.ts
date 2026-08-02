import type { JsonObject } from "../../common/JsonTypes.js";

export interface AgentMcpToolCallRequest {
  args: JsonObject;
  name: string;
  server: string;
}
