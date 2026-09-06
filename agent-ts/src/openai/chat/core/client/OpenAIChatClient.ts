import type { ChatMessageDTO } from "../../../../common/model/ChatStreamRequest.js";
import type { AgentConfig } from "../../../../config/model/core/AgentConfig.js";
import type { OpenAIChatStreamEvent } from "../../../../protocol/events/model/openai/OpenAIChatStreamEvent.js";
import { type OpenAIToolExecutor, OpenAIToolRoundRunner } from "../../../tools/runtime/core/runner/OpenAIToolRoundRunner.js";
import { OpenAIChatCompletionStreamer } from "../../completion/core/OpenAIChatCompletionStreamer.js";
import type { OpenAIChatJsonSchema } from "../../completion/model/OpenAIChatJsonSchema.js";
import type { OpenAIChatResponseFormat } from "../../completion/model/OpenAIChatResponseFormat.js";
import { OpenAIChatMessageMapper } from "../../mapping/OpenAIChatMessageMapper.js";
import type { OpenAIChatTool } from "../../model/tool/OpenAIChatTool.js";
import { OpenAIChatEventStreamer } from "../streamer/OpenAIChatEventStreamer.js";

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

  async *streamChat(
    messages: ChatMessageDTO[],
    signal?: AbortSignal,
    responseFormat?: OpenAIChatResponseFormat
  ): AsyncGenerator<string> {
    for await (const event of this.streamChatEvents(messages, [], undefined, signal, responseFormat)) {
      if (event.type === "delta") {
        yield event.text;
      }
    }
  }

  async chatWithJsonMode(messages: ChatMessageDTO[], signal?: AbortSignal): Promise<string> {
    let responseText = "";
    for await (const delta of this.streamChat(messages, signal, { type: "json_object" })) {
      responseText += delta;
    }
    return responseText;
  }

  async chatWithStructuredOutput(
    messages: ChatMessageDTO[],
    schema: OpenAIChatJsonSchema,
    signal?: AbortSignal
  ): Promise<string> {
    let responseText = "";
    for await (const delta of this.streamChat(messages, signal, { type: "json_schema", json_schema: schema })) {
      responseText += delta;
    }
    return responseText;
  }

  async *streamChatEvents(
    messages: ChatMessageDTO[],
    tools: OpenAIChatTool[] = [],
    toolExecutor?: OpenAIToolExecutor,
    signal?: AbortSignal,
    responseFormat?: OpenAIChatResponseFormat
  ): AsyncGenerator<OpenAIChatStreamEvent> {
    for await (const event of this.eventStreamer.stream(messages, tools, toolExecutor, signal, responseFormat)) {
      yield event;
    }
  }
}
