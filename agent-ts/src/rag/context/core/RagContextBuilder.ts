import type { ChatMessageDTO, ChatStreamRequest } from "../../../common/model/ChatStreamRequest.js";
import type { RagApiClient } from "../../api/core/RagApiClient.js";
import { RagSystemMessageFactory } from "../rendering/message/RagSystemMessageFactory.js";
import { RagPromptRenderer } from "../rendering/prompt/RagPromptRenderer.js";

export class RagContextBuilder {
  private readonly promptRenderer = new RagPromptRenderer();
  private readonly systemMessageFactory = new RagSystemMessageFactory();

  constructor(private readonly ragClient: RagApiClient) {}

  async injectRag(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    const knowledgeBaseId = this.resolveKnowledgeBaseId(request);
    if (!knowledgeBaseId) {
      return request.messages;
    }

    try {
      const documents = await this.ragClient.listDocuments(knowledgeBaseId);
      const prompt = this.promptRenderer.render(knowledgeBaseId, documents);
      if (!prompt) {
        return request.messages;
      }
      return [this.systemMessageFactory.create(prompt), ...request.messages];
    } catch {
      return request.messages;
    }
  }

  private resolveKnowledgeBaseId(request: ChatStreamRequest): number {
    const anyRequest = request as ChatStreamRequest & { knowledgeBaseId?: number | null };
    const knowledgeBaseId = anyRequest.knowledgeBaseId ?? 0;
    return knowledgeBaseId > 0 ? knowledgeBaseId : 0;
  }
}
