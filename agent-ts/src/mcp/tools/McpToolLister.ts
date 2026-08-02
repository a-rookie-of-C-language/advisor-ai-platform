import { DirectHttpMcpClientRegistry } from "../directHttp/core/DirectHttpMcpClientRegistry.js";
import { McpSupportedConfigProvider } from "../config/McpSupportedConfigProvider.js";
import type { McpToolDescriptor } from "./model/McpToolDescriptor.js";
import { McpToolDescriptorSorter } from "./mapping/McpToolDescriptorSorter.js";

export class McpToolLister {
  private readonly toolDescriptorSorter = new McpToolDescriptorSorter();

  constructor(
    private readonly supportedConfigProvider: McpSupportedConfigProvider,
    private readonly clientRegistry: DirectHttpMcpClientRegistry,
  ) {}

  async list(): Promise<McpToolDescriptor[]> {
    const tools: McpToolDescriptor[] = [];
    for (const config of this.supportedConfigProvider.list()) {
      tools.push(...(await this.clientRegistry.clientFor(config).listTools()));
    }
    return this.toolDescriptorSorter.sort(tools);
  }
}
