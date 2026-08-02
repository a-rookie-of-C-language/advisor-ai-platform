import type { AgentHttpRequestReader } from "../../http/request/AgentHttpRequestReader.js";
import type { AgentWorkspaceListRequest } from "./AgentWorkspaceListRequest.js";

export class AgentWorkspaceListRequestReader {
  constructor(private readonly requestReader: AgentHttpRequestReader) {}

  read(url: URL): AgentWorkspaceListRequest {
    const scope = this.requestReader.readWorkspaceScope(url);
    const path = url.searchParams.get("path") || ".";
    const recursive = this.requestReader.readBooleanQuery(url.searchParams.get("recursive"), false);
    return { path, recursive, scope };
  }
}
