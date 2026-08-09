import type { ChatMessageDTO } from "../../../common/model/ChatStreamRequest.js";
import type { MemoryContextLoadResult } from "../model/MemoryContextLoadResult.js";
import { MemorySystemMessageFactory } from "../rendering/message/MemorySystemMessageFactory.js";
import { MemoryPromptRenderer } from "../rendering/prompt/MemoryPromptRenderer.js";

export class MemoryContextMessageInjector {
  private readonly promptRenderer: MemoryPromptRenderer;
  private readonly systemMessageFactory = new MemorySystemMessageFactory();

  constructor(topK: number) {
    this.promptRenderer = new MemoryPromptRenderer(topK);
  }

  inject(messages: ChatMessageDTO[], loadResult: MemoryContextLoadResult): ChatMessageDTO[] {
    const prompt = this.promptRenderer.render(loadResult.summary, loadResult.coreMemories, loadResult.longTermMemories);
    if (!prompt) {
      return messages;
    }
    return [this.systemMessageFactory.create(prompt), ...messages];
  }
}
