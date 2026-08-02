import type { JsonObject } from "../../common/json/JsonTypes.js";

export class McpJsonRpcRequestFactory {
  createInitializeRequest(): JsonObject {
    return { jsonrpc: "2.0", id: 1, method: "initialize", params: {} };
  }

  createListToolsRequest(): JsonObject {
    return { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };
  }

  createCallToolRequest(name: string, args: JsonObject): JsonObject {
    return {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name, arguments: args }
    };
  }
}
