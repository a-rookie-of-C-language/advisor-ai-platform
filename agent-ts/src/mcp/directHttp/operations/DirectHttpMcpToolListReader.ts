import { JsonObjectReader } from "../../../common/json/JsonObjectReader.js";
import type { McpJsonRpcRequestFactory } from "../../jsonRpc/McpJsonRpcRequestFactory.js";
import type { McpToolDescriptor } from "../../tools/model/McpToolDescriptor.js";
import { McpToolDescriptorMapper } from "../../tools/McpToolDescriptorMapper.js";
import type { DirectHttpMcpJsonRpcClient } from "../protocol/DirectHttpMcpJsonRpcClient.js";
import type { DirectHttpMcpInitializer } from "./DirectHttpMcpInitializer.js";

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
