import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { AgentWorkspaceScopedRouteRequest } from "../../model/maintenance/AgentWorkspaceScopedRouteRequest.js";

export class AgentWorkspaceScopedRouteRequestReader {
  constructor(private readonly requestReader: AgentHttpRequestReader) {}

  read(url: URL): AgentWorkspaceScopedRouteRequest {
    return { scope: this.requestReader.readWorkspaceScope(url) };
  }
}
