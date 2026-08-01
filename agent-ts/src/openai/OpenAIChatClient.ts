import type { AgentConfig } from "../config/AgentConfig.js";
import type { ChatMessageDTO } from "../common/ChatStreamRequest.js";
import { OpenAIChatMessageMapper } from "./OpenAIChatMessageMapper.js";
import { OpenAIChatCompletionStreamer } from "./OpenAIChatCompletionStreamer.js";
import type { OpenAIChatStreamEvent } from "../protocol/OpenAIChatStreamEvent.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import { type OpenAIToolExecutor, OpenAIToolRoundRunner } from "./OpenAIToolRoundRunner.js";

export class OpenAIChatClient {
  private readonly completionStreamer: OpenAIChatCompletionStreamer;
  private readonly messageMapper = new OpenAIChatMessageMapper();
  private readonly toolRoundRunner = new OpenAIToolRoundRunner();

  constructor(private readonly config: AgentConfig) {
    this.completionStreamer = new OpenAIChatCompletionStreamer(config);
  }

  async *streamChat(messages: ChatMessageDTO[]): AsyncGenerator<string> {
    for await (const event of this.streamChatEvents(messages)) {
      if (event.type === "delta") {
        yield event.text;
      }
    }
  }

  async *streamChatEvents(
    messages: ChatMessageDTO[],
    tools: OpenAIChatTool[] = [],
    toolExecutor?: OpenAIToolExecutor
  ): AsyncGenerator<OpenAIChatStreamEvent> {
    if (!this.config.openAiApiKey) {
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
