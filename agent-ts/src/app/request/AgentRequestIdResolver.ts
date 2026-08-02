import type { IncomingMessage } from "node:http";
import type { ChatStreamRequest } from "../../common/ChatStreamRequest.js";
import { AgentRequestHeaderValueResolver } from "./AgentRequestHeaderValueResolver.js";

export class AgentRequestIdResolver {
  private readonly headerValueResolver = new AgentRequestHeaderValueResolver();

  resolveTraceId(chatRequest: ChatStreamRequest, request: IncomingMessage): string {
    return this.headerValueResolver.resolve(request, "x-trace-id", chatRequest.traceId);
  }

  resolveTurnId(chatRequest: ChatStreamRequest, request: IncomingMessage): string {
    return this.headerValueResolver.resolve(request, "x-turn-id", chatRequest.turnId);
  }
}
