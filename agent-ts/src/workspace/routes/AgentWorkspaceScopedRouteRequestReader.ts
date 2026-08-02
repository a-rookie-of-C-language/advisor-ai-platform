import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { AgentWorkspaceScopedRouteRequest } from "./AgentWorkspaceScopedRouteRequest.js";

export class AgentWorkspaceScopedRouteRequestReader {
  constructor(private readonly requestReader: AgentHttpRequestReader) {}

  read(url: URL): AgentWorkspaceScopedRouteRequest {
    return { scope: this.requestReader.readWorkspaceScope(url) };
  }
}
