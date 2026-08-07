import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../../../../http/request/AgentHttpRequestReader.js";
import type { AgentWorkspaceWriteRequest } from "../../../model/mutation/AgentWorkspaceWriteRequest.js";

export class AgentWorkspaceWriteRequestReader {
  constructor(private readonly requestReader: AgentHttpRequestReader) {}

  async read(url: URL, request: IncomingMessage): Promise<AgentWorkspaceWriteRequest> {
    const scope = this.requestReader.readWorkspaceScope(url);
    const body = await this.requestReader.readJsonObject(request);
    const path = this.requestReader.readRequiredString(body, "path");
    const content = this.requestReader.readRequiredString(body, "content");
    const isFinal = this.requestReader.readOptionalBoolean(body, "is_final", false);
    return { content, isFinal, path, scope };
  }
}
