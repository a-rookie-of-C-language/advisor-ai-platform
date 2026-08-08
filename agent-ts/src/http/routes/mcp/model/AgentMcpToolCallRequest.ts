import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";

export interface AgentMcpToolCallRequest {
  args: JsonObject;
  name: string;
  server: string;
}
