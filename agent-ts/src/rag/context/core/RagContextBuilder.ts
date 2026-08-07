import type { ChatMessageDTO, ChatStreamRequest } from "../../../common/model/ChatStreamRequest.js";
import type { RagApiClient } from "../../api/RagApiClient.js";
import { RagSystemMessageFactory } from "../rendering/message/RagSystemMessageFactory.js";
import { RagPromptRenderer } from "../rendering/prompt/RagPromptRenderer.js";

export class RagContextBuilder {
  private readonly promptRenderer = new RagPromptRenderer();
  private readonly systemMessageFactory = new RagSystemMessageFactory();

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
      return [this.systemMessageFactory.create(prompt), ...request.messages];
    } catch {
      return request.messages;
    }
  }
}
