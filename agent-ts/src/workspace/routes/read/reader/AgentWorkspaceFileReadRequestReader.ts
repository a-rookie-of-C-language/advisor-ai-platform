import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { AgentWorkspaceFileReadRequest } from "../../model/read/file/AgentWorkspaceFileReadRequest.js";

export class AgentWorkspaceFileReadRequestReader {
  constructor(private readonly requestReader: AgentHttpRequestReader) {}

  async read(url: URL, request: IncomingMessage): Promise<AgentWorkspaceFileReadRequest> {
    const scope = this.requestReader.readWorkspaceScope(url);
    const body = await this.requestReader.readJsonObject(request);
    const path = this.requestReader.readRequiredString(body, "path");
    const offset = this.requestReader.readOptionalNumber(body, "offset", 0);
    const limit = this.requestReader.readOptionalNumber(body, "limit", 8192);
    return { limit, offset, path, scope };
  }
}
