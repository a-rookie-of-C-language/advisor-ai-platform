import type { IncomingMessage } from "node:http";
import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";

export class AgentRequestIdResolver {
  resolveTraceId(chatRequest: ChatStreamRequest, request: IncomingMessage): string {
    return String(request.headers["x-trace-id"] || chatRequest.traceId || "");
  }

  resolveTurnId(chatRequest: ChatStreamRequest, request: IncomingMessage): string {
    return String(request.headers["x-turn-id"] || chatRequest.turnId || "");
  }
}
