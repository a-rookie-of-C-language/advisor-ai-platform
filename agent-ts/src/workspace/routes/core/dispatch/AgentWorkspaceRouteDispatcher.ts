import type { IncomingMessage } from "node:http";
import type { HttpRouteResult } from "../../../../http/response/model/HttpRouteResult.js";
import type { AgentWorkspaceRouteComponents } from "../model/AgentWorkspaceRouteComponents.js";

export class AgentWorkspaceRouteDispatcher {
  constructor(private readonly components: AgentWorkspaceRouteComponents) {}

  async dispatch(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    const maintenanceResult = await this.components.maintenanceRouteHandler.handle(method, url);
    if (maintenanceResult) {
      return maintenanceResult;
    }

    const readResult = await this.components.readRouteHandler.handle(method, url, request);
    if (readResult) {
      return readResult;
    }

    const mutationResult = await this.components.mutationRouteHandler.handle(method, url, request);
    if (mutationResult) {
      return mutationResult;
    }

    return null;
  }
}
