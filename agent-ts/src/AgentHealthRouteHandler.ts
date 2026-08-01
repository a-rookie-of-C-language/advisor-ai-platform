import type { AgentRuntime } from "./AgentRuntime.js";
import type { HttpRouteResult } from "./HttpRouteResult.js";

export class AgentHealthRouteHandler {
  constructor(private readonly runtime: AgentRuntime) {}

  async handle(method: string | undefined, url: URL): Promise<HttpRouteResult | null> {
    if (method === "GET" && url.pathname === "/health") {
      return {
        statusCode: 200,
        body: { status: "ok", runtime: "typescript", core: await this.runtime.coreHealth() }
      };
    }

    if (method === "GET" && url.pathname === "/graph/health") {
      return { statusCode: 200, body: this.runtime.graphHealth() };
    }

    return null;
  }
}
