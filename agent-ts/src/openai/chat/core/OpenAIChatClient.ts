import type { ChatMessageDTO } from "../../../common/model/ChatStreamRequest.js";
import type { AgentConfig } from "../../../config/model/AgentConfig.js";
import type { OpenAIChatStreamEvent } from "../../../protocol/events/OpenAIChatStreamEvent.js";
import { type OpenAIToolExecutor, OpenAIToolRoundRunner } from "../../tools/runtime/OpenAIToolRoundRunner.js";
import { OpenAIChatCompletionStreamer } from "../completion/OpenAIChatCompletionStreamer.js";
import { OpenAIChatMessageMapper } from "../mapping/OpenAIChatMessageMapper.js";
import type { OpenAIChatTool } from "../model/OpenAIChatTool.js";
import { OpenAIChatEventStreamer } from "./OpenAIChatEventStreamer.js";

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
