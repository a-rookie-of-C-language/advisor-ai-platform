import type { ChatMessageDTO } from "../common/ChatStreamRequest.js";
import type { MemoryContextLoadResult } from "./MemoryContextLoadResult.js";
import { MemoryPromptRenderer } from "./MemoryPromptRenderer.js";
import { MemorySystemMessageFactory } from "./MemorySystemMessageFactory.js";

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
    return [
      this.systemMessageFactory.create(prompt),
      ...messages
    ];
  }
}
