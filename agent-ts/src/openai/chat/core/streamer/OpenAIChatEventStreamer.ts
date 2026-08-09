import type { ChatMessageDTO } from "../../../../common/model/ChatStreamRequest.js";
import type { OpenAIChatStreamEvent } from "../../../../protocol/events/model/openai/OpenAIChatStreamEvent.js";
import { OpenAIToolRoundGate } from "../../../tools/runtime/core/gate/OpenAIToolRoundGate.js";
import type { OpenAIToolExecutor, OpenAIToolRoundRunner } from "../../../tools/runtime/core/runner/OpenAIToolRoundRunner.js";
import type { OpenAIChatCompletionStreamer } from "../../completion/core/OpenAIChatCompletionStreamer.js";
import { OpenAIChatRoundEventFactory } from "../../events/round/OpenAIChatRoundEventFactory.js";
import type { OpenAIChatMessageMapper } from "../../mapping/OpenAIChatMessageMapper.js";
import type { OpenAIChatTool } from "../../model/tool/OpenAIChatTool.js";

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
    toolExecutor?: OpenAIToolExecutor,
    signal?: AbortSignal
  ): AsyncGenerator<OpenAIChatStreamEvent> {
    if (!this.openAiApiKey) {
      return;
    }

    const conversation = this.messageMapper.map(messages);
    const firstRound = await this.completionStreamer.collectStream(conversation, tools, signal);
    for (const event of this.roundEventFactory.create(firstRound)) {
      yield event;
    }

    if (!this.toolRoundGate.shouldRun(firstRound.toolCalls, tools, toolExecutor)) {
      return;
    }

    for await (const event of this.toolRoundRunner.run(conversation, firstRound.toolCalls, toolExecutor!, signal)) {
      yield event;
    }

    const finalRound = await this.completionStreamer.collectStream(conversation, [], signal);
    for (const event of this.roundEventFactory.create(finalRound)) {
      yield event;
    }
  }
}
