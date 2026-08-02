import { JsonObjectReader } from "../../../common/json/JsonObjectReader.js";
import type { JsonObject } from "../../../common/json/JsonTypes.js";
import type { McpJsonRpcRequestFactory } from "../../jsonRpc/McpJsonRpcRequestFactory.js";
import type { McpCallToolResult } from "../../tools/model/McpCallToolResult.js";
import { McpCallToolResultMapper } from "../../tools/McpCallToolResultMapper.js";
import type { DirectHttpMcpJsonRpcClient } from "../protocol/DirectHttpMcpJsonRpcClient.js";
import type { DirectHttpMcpInitializer } from "./DirectHttpMcpInitializer.js";

export class DirectHttpMcpToolCaller {
  private readonly callToolResultMapper = new McpCallToolResultMapper();
  private readonly jsonObjectReader = new JsonObjectReader();

  constructor(
    private readonly initializer: DirectHttpMcpInitializer,
    private readonly jsonRpcClient: DirectHttpMcpJsonRpcClient,
    private readonly requestFactory: McpJsonRpcRequestFactory,
  ) {}

  async callTool(name: string, args: JsonObject): Promise<McpCallToolResult> {
    await this.initializer.ensureInitialized();
    const response = await this.jsonRpcClient.post(this.requestFactory.createCallToolRequest(name, args));
    const result = this.jsonObjectReader.asObject(response.result);
    return this.callToolResultMapper.mapResult(result);
  }
}
