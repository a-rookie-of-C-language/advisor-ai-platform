import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";
import type { McpServerConfig } from "../../../config/model/McpServerConfig.js";
import { McpJsonRpcRequestFactory } from "../../../jsonRpc/factory/McpJsonRpcRequestFactory.js";
import type { McpToolDescriptor } from "../../../tools/model/descriptor/McpToolDescriptor.js";
import type { McpCallToolResult } from "../../../tools/model/result/McpCallToolResult.js";
import { DirectHttpMcpInitializer } from "../../operations/lifecycle/DirectHttpMcpInitializer.js";
import { DirectHttpMcpToolCaller } from "../../operations/calling/DirectHttpMcpToolCaller.js";
import { DirectHttpMcpToolListReader } from "../../operations/listing/DirectHttpMcpToolListReader.js";
import { DirectHttpMcpJsonRpcClient } from "../../protocol/core/DirectHttpMcpJsonRpcClient.js";

export class DirectHttpMcpClient {
  private readonly initializer: DirectHttpMcpInitializer;
  private readonly jsonRpcClient: DirectHttpMcpJsonRpcClient;
  private readonly requestFactory = new McpJsonRpcRequestFactory();
  private readonly toolCaller: DirectHttpMcpToolCaller;
  private readonly toolListReader: DirectHttpMcpToolListReader;

  constructor(config: McpServerConfig) {
    this.jsonRpcClient = new DirectHttpMcpJsonRpcClient(config);
    this.initializer = new DirectHttpMcpInitializer(this.jsonRpcClient, this.requestFactory);
    this.toolCaller = new DirectHttpMcpToolCaller(this.initializer, this.jsonRpcClient, this.requestFactory);
    this.toolListReader = new DirectHttpMcpToolListReader(
      config.name,
      this.initializer,
      this.jsonRpcClient,
      this.requestFactory,
    );
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    return this.toolListReader.listTools();
  }

  async callTool(name: string, args: JsonObject): Promise<McpCallToolResult> {
    return this.toolCaller.callTool(name, args);
  }
}
