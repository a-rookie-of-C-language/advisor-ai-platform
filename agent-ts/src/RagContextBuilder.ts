import type { ChatMessageDTO, ChatStreamRequest } from "./common/ChatStreamRequest.js";
import type { RagApiClient } from "./RagApiClient.js";
import type { RagDocument } from "./RagDocument.js";

export class RagContextBuilder {
  constructor(private readonly ragClient: RagApiClient) {}

  async injectRag(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    if (!request.kbId || request.kbId <= 0) {
      return request.messages;
    }

    try {
      const documents = await this.ragClient.listDocuments(request.kbId);
      const prompt = this.renderPrompt(request.kbId, documents);
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

  private renderPrompt(kbId: number, documents: RagDocument[]): string {
    const readyDocuments = documents.filter((document) => document.status === "READY" || document.status === "INDEXED");
    if (readyDocuments.length === 0) {
      return "";
    }
    const renderedDocuments = readyDocuments
      .slice(0, 10)
      .map((document, index) => `${index + 1}. ${document.fileName} (${document.fileType || "unknown"}, ${document.fileSize || 0} bytes)`)
      .join("\n");
    return `Knowledge base id: ${kbId}\nAvailable documents:\n${renderedDocuments}`;
  }
}
