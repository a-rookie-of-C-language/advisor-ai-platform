import type { JsonObject } from "../../../../common/json/JsonTypes.js";

export interface AgentMcpToolCallRequest {
  args: JsonObject;
  name: string;
  server: string;
}
