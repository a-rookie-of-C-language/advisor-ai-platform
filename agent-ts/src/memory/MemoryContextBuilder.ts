import type { ChatMessageDTO, ChatStreamRequest } from "../common/ChatStreamRequest.js";
import { LastUserMessageFinder } from "./LastUserMessageFinder.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryContextLoader } from "./MemoryContextLoader.js";
import { MemoryContextRequestGate } from "./MemoryContextRequestGate.js";
import { MemoryPromptRenderer } from "./MemoryPromptRenderer.js";
import { MemorySystemMessageFactory } from "./MemorySystemMessageFactory.js";

export class MemoryContextBuilder {
  private readonly lastUserMessageFinder = new LastUserMessageFinder();
  private readonly loader: MemoryContextLoader;
  private readonly promptRenderer: MemoryPromptRenderer;
  private readonly requestGate = new MemoryContextRequestGate();
  private readonly systemMessageFactory = new MemorySystemMessageFactory();

  constructor(
    private readonly memoryClient: MemoryApiClient,
    private readonly topK: number
  ) {
    this.loader = new MemoryContextLoader(this.memoryClient, this.topK);
    this.promptRenderer = new MemoryPromptRenderer(this.topK);
  }

  async injectMemory(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    const userQuery = this.lastUserMessageFinder.find(request.messages);
    if (!this.requestGate.shouldLoad(request.userId, request.sessionId, userQuery)) {
      return request.messages;
    }

    try {
      const { summary, coreMemories, longTermMemories } = await this.loader.load(
        request.userId!,
        request.sessionId!,
        userQuery
      );
      const prompt = this.promptRenderer.render(summary, coreMemories, longTermMemories);
      if (!prompt) {
        return request.messages;
      }
      return [
        this.systemMessageFactory.create(prompt),
        ...request.messages
      ];
    } catch {
      return request.messages;
    }
  }
}
