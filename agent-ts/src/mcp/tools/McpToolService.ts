import type { JsonObject } from "../../common/json/JsonTypes.js";
import { DirectHttpMcpClientRegistry } from "../directHttp/core/DirectHttpMcpClientRegistry.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpServerConfig } from "../config/McpServerConfig.js";
import { McpSupportedConfigProvider } from "../config/McpSupportedConfigProvider.js";
import { McpToolCaller } from "./McpToolCaller.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import { McpToolLister } from "./McpToolLister.js";

export class McpToolService {
  private readonly clientRegistry = new DirectHttpMcpClientRegistry();
  private readonly supportedConfigProvider: McpSupportedConfigProvider;
  private readonly toolCaller: McpToolCaller;
  private readonly toolLister: McpToolLister;

  constructor(configs: McpServerConfig[]) {
    this.supportedConfigProvider = new McpSupportedConfigProvider(configs);
    this.toolCaller = new McpToolCaller(this.supportedConfigProvider, this.clientRegistry);
    this.toolLister = new McpToolLister(this.supportedConfigProvider, this.clientRegistry);
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    return this.toolLister.list();
  }

  async callTool(server: string, name: string, args: JsonObject): Promise<McpCallToolResult> {
    return this.toolCaller.call(server, name, args);
  }
}
