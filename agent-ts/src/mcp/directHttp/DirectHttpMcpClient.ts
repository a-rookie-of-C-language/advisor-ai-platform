import type { JsonObject } from "../../common/json/JsonTypes.js";
import { DirectHttpMcpInitializer } from "./DirectHttpMcpInitializer.js";
import { DirectHttpMcpJsonRpcClient } from "./protocol/DirectHttpMcpJsonRpcClient.js";
import { DirectHttpMcpToolCaller } from "./DirectHttpMcpToolCaller.js";
import { DirectHttpMcpToolListReader } from "./DirectHttpMcpToolListReader.js";
import { McpJsonRpcRequestFactory } from "../jsonRpc/McpJsonRpcRequestFactory.js";
import type { McpCallToolResult } from "../tools/McpCallToolResult.js";
import type { McpToolDescriptor } from "../tools/McpToolDescriptor.js";
import type { McpServerConfig } from "../config/McpServerConfig.js";

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
