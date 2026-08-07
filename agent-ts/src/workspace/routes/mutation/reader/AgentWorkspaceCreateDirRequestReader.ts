import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { AgentWorkspaceCreateDirRequest } from "../../model/mutation/AgentWorkspaceCreateDirRequest.js";

export class AgentWorkspaceCreateDirRequestReader {
  constructor(private readonly requestReader: AgentHttpRequestReader) {}

  async read(url: URL, request: IncomingMessage): Promise<AgentWorkspaceCreateDirRequest> {
    const scope = this.requestReader.readWorkspaceScope(url);
    const body = await this.requestReader.readJsonObject(request);
    const path = this.requestReader.readRequiredString(body, "path");
    const isFinal = this.requestReader.readOptionalBoolean(body, "is_final", false);
    return { isFinal, path, scope };
  }
}
