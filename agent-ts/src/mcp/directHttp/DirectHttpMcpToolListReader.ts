import { JsonObjectReader } from "../../common/json/JsonObjectReader.js";
import { DirectHttpMcpInitializer } from "./DirectHttpMcpInitializer.js";
import { DirectHttpMcpJsonRpcClient } from "./DirectHttpMcpJsonRpcClient.js";
import { McpJsonRpcRequestFactory } from "../jsonRpc/McpJsonRpcRequestFactory.js";
import type { McpToolDescriptor } from "../tools/McpToolDescriptor.js";
import { McpToolDescriptorMapper } from "../tools/McpToolDescriptorMapper.js";

export class DirectHttpMcpToolListReader {
  private readonly jsonObjectReader = new JsonObjectReader();
  private readonly toolDescriptorMapper = new McpToolDescriptorMapper();

  constructor(
    private readonly serverName: string,
    private readonly initializer: DirectHttpMcpInitializer,
    private readonly jsonRpcClient: DirectHttpMcpJsonRpcClient,
    private readonly requestFactory: McpJsonRpcRequestFactory,
  ) {}

  async listTools(): Promise<McpToolDescriptor[]> {
    await this.initializer.ensureInitialized();
    const response = await this.jsonRpcClient.post(this.requestFactory.createListToolsRequest());
    const result = this.jsonObjectReader.asObject(response.result);
    return this.toolDescriptorMapper.mapTools(result, this.serverName);
  }
}
