import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../AgentHttpRequestReader.js";
import type { AgentMcpToolCallRequest } from "./AgentMcpToolCallRequest.js";

export class AgentMcpToolCallRequestReader {
  constructor(private readonly requestReader: AgentHttpRequestReader) {}

  async read(request: IncomingMessage): Promise<AgentMcpToolCallRequest> {
    const body = await this.requestReader.readJsonObject(request);
    const server = this.requestReader.readRequiredString(body, "server");
    const name = this.requestReader.readRequiredString(body, "name");
    const args = this.requestReader.readOptionalJsonObject(body, "arguments");
    return {
      args,
      name,
      server
    };
  }
}
