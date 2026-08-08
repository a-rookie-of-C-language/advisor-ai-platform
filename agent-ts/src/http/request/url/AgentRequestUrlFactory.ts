import type { IncomingMessage } from "node:http";

export class AgentRequestUrlFactory {
  create(request: IncomingMessage): URL {
    return new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  }
}
