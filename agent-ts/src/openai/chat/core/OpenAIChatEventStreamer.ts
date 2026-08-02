import type { ChatMessageDTO } from "../../../common/model/ChatStreamRequest.js";
import type { OpenAIChatStreamEvent } from "../../../protocol/events/OpenAIChatStreamEvent.js";
import { OpenAIToolRoundGate } from "../../tools/runtime/core/OpenAIToolRoundGate.js";
import type { OpenAIToolExecutor, OpenAIToolRoundRunner } from "../../tools/runtime/core/OpenAIToolRoundRunner.js";
import type { OpenAIChatCompletionStreamer } from "../completion/OpenAIChatCompletionStreamer.js";
import { OpenAIChatRoundEventFactory } from "../events/OpenAIChatRoundEventFactory.js";
import type { OpenAIChatMessageMapper } from "../mapping/OpenAIChatMessageMapper.js";
import type { OpenAIChatTool } from "../model/OpenAIChatTool.js";

export class OpenAIChatEventStreamer {
  private readonly roundEventFactory = new OpenAIChatRoundEventFactory();
  private readonly toolRoundGate = new OpenAIToolRoundGate();

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
    for (const event of this.roundEventFactory.create(firstRound)) {
      yield event;
    }

    if (!this.toolRoundGate.shouldRun(firstRound.toolCalls, tools, toolExecutor)) {
      return;
    }

    for await (const event of this.toolRoundRunner.run(conversation, firstRound.toolCalls, toolExecutor!)) {
      yield event;
    }

    const finalRound = await this.completionStreamer.collectStream(conversation);
    for (const event of this.roundEventFactory.create(finalRound)) {
      yield event;
    }
  }
}
