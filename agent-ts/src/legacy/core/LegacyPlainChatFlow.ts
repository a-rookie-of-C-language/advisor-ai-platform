import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { AgentLoop } from "../../app/loop/core/AgentLoop.js";
import type { OpenAIChatStreamEvent } from "../../protocol/events/model/openai/OpenAIChatStreamEvent.js";

export class LegacyPlainChatFlow {
  async *stream(_request: ChatStreamRequest, loop: AgentLoop): AsyncGenerator<OpenAIChatStreamEvent> {
    const result = await loop.run();
    if (result.answer) {
      yield { type: "delta", text: result.answer };
    }
  }
}
