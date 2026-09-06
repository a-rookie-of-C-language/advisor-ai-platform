import type { ChatMessageDTO, ChatStreamRequest } from "../../../common/model/ChatStreamRequest.js";
import type { RagApiClient } from "../../api/core/RagApiClient.js";
import { RagSystemMessageFactory } from "../rendering/message/RagSystemMessageFactory.js";
import { RagPromptRenderer } from "../rendering/prompt/RagPromptRenderer.js";

export class RagContextBuilder {
  private readonly promptRenderer = new RagPromptRenderer();
  private readonly systemMessageFactory = new RagSystemMessageFactory();

  constructor(private readonly ragClient: RagApiClient) {}

  async injectRag(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    const kbId = this.resolveKnowledgeBaseId(request);
    if (!kbId) {
      return request.messages;
    }

    try {
      const documents = await this.ragClient.listDocuments(kbId);
      const prompt = this.promptRenderer.render(kbId, documents);
      if (!prompt) {
        return request.messages;
      }
      return [this.systemMessageFactory.create(prompt), ...request.messages];
    } catch {
      return request.messages;
    }
  }

  private resolveKnowledgeBaseId(request: ChatStreamRequest): number {
    const anyRequest = request as ChatStreamRequest & { kbId?: number | null };
    const kbId = anyRequest.kbId ?? 0;
    return kbId > 0 ? kbId : 0;
  }
}
