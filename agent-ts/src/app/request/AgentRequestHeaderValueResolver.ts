import type { IncomingMessage } from "node:http";

export class AgentRequestHeaderValueResolver {
  resolve(request: IncomingMessage, headerName: string, fallback: string | null | undefined): string {
    return String(request.headers[headerName] || fallback || "");
  }
}
