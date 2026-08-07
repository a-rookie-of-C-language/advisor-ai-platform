import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../../../../http/request/AgentHttpRequestReader.js";
import type { AgentWorkspaceEditRequest } from "../../../model/mutation/AgentWorkspaceEditRequest.js";

export class AgentWorkspaceEditRequestReader {
  constructor(private readonly requestReader: AgentHttpRequestReader) {}

  async read(url: URL, request: IncomingMessage): Promise<AgentWorkspaceEditRequest> {
    const scope = this.requestReader.readWorkspaceScope(url);
    const body = await this.requestReader.readJsonObject(request);
    const path = this.requestReader.readRequiredString(body, "path");
    const oldString = this.requestReader.readRequiredString(body, "old_string");
    const newString = this.requestReader.readRequiredString(body, "new_string");
    const isFinal = this.requestReader.readOptionalBoolean(body, "is_final", false);
    return { isFinal, newString, oldString, path, scope };
  }
}
