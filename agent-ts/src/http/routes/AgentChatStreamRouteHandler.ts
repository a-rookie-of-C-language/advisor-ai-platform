import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentRuntime } from "../../app/AgentRuntime.js";
import { parseJsonBody } from "../HttpBodyParser.js";

export class AgentChatStreamRouteHandler {
  constructor(private readonly runtime: AgentRuntime) {}

  async handle(
    method: string | undefined,
    url: URL,
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<boolean> {
    if (method !== "POST" || url.pathname !== "/chat/stream") {
      return false;
    }

    const body = await parseJsonBody(request);
    await this.runtime.streamChat(body, request, response);
    return true;
  }
}
