import type { ChatMessageDTO, ChatStreamRequest } from "../common/ChatStreamRequest.js";
import { LastUserMessageFinder } from "./LastUserMessageFinder.js";
import type { MemoryApiClient } from "./api/MemoryApiClient.js";
import { MemoryContextLoader } from "./MemoryContextLoader.js";
import { MemoryContextMessageInjector } from "./MemoryContextMessageInjector.js";
import { MemoryContextRequestGate } from "./MemoryContextRequestGate.js";

export class MemoryContextBuilder {
  private readonly lastUserMessageFinder = new LastUserMessageFinder();
  private readonly loader: MemoryContextLoader;
  private readonly messageInjector: MemoryContextMessageInjector;
  private readonly requestGate = new MemoryContextRequestGate();

  constructor(
    private readonly memoryClient: MemoryApiClient,
    private readonly topK: number
  ) {
    this.loader = new MemoryContextLoader(this.memoryClient, this.topK);
    this.messageInjector = new MemoryContextMessageInjector(this.topK);
  }

  async injectMemory(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    const userQuery = this.lastUserMessageFinder.find(request.messages);
    if (!this.requestGate.shouldLoad(request.userId, request.sessionId, userQuery)) {
      return request.messages;
    }

    try {
      const loadResult = await this.loader.load(
        request.userId!,
        request.sessionId!,
        userQuery
      );
      return this.messageInjector.inject(request.messages, loadResult);
    } catch {
      return request.messages;
    }
  }
}
