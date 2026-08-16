import type { AgentRuntime } from "../../../app/runtime/core/AgentRuntime.js";
import type { HttpRouteResult } from "../../response/model/HttpRouteResult.js";

export class AgentModelRouteHandler {
  constructor(private readonly runtime: AgentRuntime) {}

  async handle(method: string | undefined, url: URL): Promise<HttpRouteResult | null> {
    if (method !== "GET" || (url.pathname !== "/models" && url.pathname !== "/v1/models")) return null;
    return { statusCode: 200, body: this.runtime.models() };
  }
}
