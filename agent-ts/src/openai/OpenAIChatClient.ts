import type { AgentConfig } from "../config/AgentConfig.js";
import type { ChatMessageDTO } from "../common/ChatStreamRequest.js";
import { OpenAIChatEventStreamer } from "./OpenAIChatEventStreamer.js";
import { OpenAIChatMessageMapper } from "./OpenAIChatMessageMapper.js";
import { OpenAIChatCompletionStreamer } from "./chat/completion/OpenAIChatCompletionStreamer.js";
import type { OpenAIChatStreamEvent } from "../protocol/OpenAIChatStreamEvent.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import { type OpenAIToolExecutor, OpenAIToolRoundRunner } from "./OpenAIToolRoundRunner.js";

export class OpenAIChatClient {
  private readonly completionStreamer: OpenAIChatCompletionStreamer;
  private readonly eventStreamer: OpenAIChatEventStreamer;
  private readonly messageMapper = new OpenAIChatMessageMapper();
  private readonly toolRoundRunner = new OpenAIToolRoundRunner();

  constructor(config: AgentConfig) {
    this.completionStreamer = new OpenAIChatCompletionStreamer(config);
    this.eventStreamer = new OpenAIChatEventStreamer(
      config.openAiApiKey,
      this.completionStreamer,
      this.messageMapper,
      this.toolRoundRunner
    );
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
    for await (const event of this.eventStreamer.stream(messages, tools, toolExecutor)) {
      yield event;
    }
  }
}
