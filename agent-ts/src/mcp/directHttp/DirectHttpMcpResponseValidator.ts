import type { JsonRpcResponse } from "../jsonRpc/JsonRpcResponse.js";

export class DirectHttpMcpResponseValidator {
  validateHttp(response: Response): void {
    if (!response.ok) {
      throw new Error(`MCP HTTP 请求失败: ${response.status}`);
    }
  }

  validateJsonRpc(data: JsonRpcResponse): void {
    if (data.error) {
      throw new Error(`MCP JSON-RPC 错误: ${JSON.stringify(data.error)}`);
    }
  }
}
