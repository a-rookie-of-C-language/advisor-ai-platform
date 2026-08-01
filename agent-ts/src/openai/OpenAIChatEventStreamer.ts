import type { ChatMessageDTO } from "../common/ChatStreamRequest.js";
import type { OpenAIChatCompletionStreamer } from "./OpenAIChatCompletionStreamer.js";
import type { OpenAIChatMessageMapper } from "./OpenAIChatMessageMapper.js";
import type { OpenAIChatStreamEvent } from "../protocol/OpenAIChatStreamEvent.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { OpenAIToolExecutor, OpenAIToolRoundRunner } from "./OpenAIToolRoundRunner.js";

export class OpenAIChatEventStreamer {
  constructor(
    private readonly openAiApiKey: string,
    private readonly completionStreamer: OpenAIChatCompletionStreamer,
    private readonly messageMapper: OpenAIChatMessageMapper,
    private readonly toolRoundRunner: OpenAIToolRoundRunner
  ) {}

  async *stream(
    messages: ChatMessageDTO[],
    tools: OpenAIChatTool[] = [],
    toolExecutor?: OpenAIToolExecutor
  ): AsyncGenerator<OpenAIChatStreamEvent> {
    if (!this.openAiApiKey) {
      return;
    }

    const conversation = this.messageMapper.map(messages);
    const firstRound = await this.completionStreamer.collectStream(conversation, tools);
    for (const text of firstRound.textParts) {
      yield { type: "delta", text };
    }

    if (firstRound.toolCalls.length === 0 || tools.length === 0 || !toolExecutor) {
      return;
    }

    for await (const event of this.toolRoundRunner.run(conversation, firstRound.toolCalls, toolExecutor)) {
      yield event;
    }

    const finalRound = await this.completionStreamer.collectStream(conversation);
    for (const text of finalRound.textParts) {
      yield { type: "delta", text };
    }
  }
}
