import type { IncomingMessage } from "node:http";
import type { AgentConfig } from "../../../config/model/core/AgentConfig.js";

export class AgentRequestAuthorizer {
  constructor(private readonly config: AgentConfig) {}

  isAuthorized(request: IncomingMessage): boolean {
    if (!this.config.token) {
      return true;
    }
    const authorization = request.headers.authorization || "";
    const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
    const agentToken = String(request.headers["x-agent-token"] || "").trim();
    return bearer === this.config.token || agentToken === this.config.token;
  }
}
