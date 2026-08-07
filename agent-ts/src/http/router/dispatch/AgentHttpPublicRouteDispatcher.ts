import type { ServerResponse } from "node:http";
import type { AgentHttpRouteResultWriter } from "../../response/AgentHttpRouteResultWriter.js";
import type { AgentHealthRouteHandler } from "../../routes/health/AgentHealthRouteHandler.js";

export class AgentHttpPublicRouteDispatcher {
  constructor(
    private readonly healthRouteHandler: AgentHealthRouteHandler,
    private readonly routeResultWriter: AgentHttpRouteResultWriter
  ) {}

  async dispatch(method: string | undefined, url: URL, response: ServerResponse): Promise<boolean> {
    const healthResult = await this.healthRouteHandler.handle(method, url);
    return this.routeResultWriter.writeIfPresent(response, healthResult);
  }
}
