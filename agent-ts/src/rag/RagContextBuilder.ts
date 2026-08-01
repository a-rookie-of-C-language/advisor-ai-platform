import type { ChatMessageDTO, ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { RagApiClient } from "./RagApiClient.js";
import { RagPromptRenderer } from "./RagPromptRenderer.js";

export class RagContextBuilder {
  private readonly promptRenderer = new RagPromptRenderer();

  constructor(private readonly ragClient: RagApiClient) {}

  async injectRag(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    if (!request.kbId || request.kbId <= 0) {
      return request.messages;
    }

    try {
      const documents = await this.ragClient.listDocuments(request.kbId);
      const prompt = this.promptRenderer.render(request.kbId, documents);
      if (!prompt) {
        return request.messages;
      }
      return [
        {
          role: "system",
          content: `Knowledge-base context is available for this chat. Use it only when relevant.\n${prompt}`
        },
        ...request.messages
      ];
    } catch {
      return request.messages;
    }
  }
}
