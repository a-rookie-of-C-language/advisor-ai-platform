import type { ChatStreamRequest } from "./common/ChatStreamRequest.js";
import type { JsonObject } from "./common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "./openai/OpenAiToolArgumentReader.js";
import type { OpenAiToolExecutionResult } from "./openai/OpenAiToolExecutionResult.js";
import type { RagApiClient } from "./RagApiClient.js";

export class RagOpenAiToolExecutor {
  constructor(private readonly ragClient: RagApiClient) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    if (!request.kbId || request.kbId <= 0) {
      throw new Error("未选择知识库，无法执行 rag_search");
    }

    const query = OpenAiToolArgumentReader.readOptionalString(args, "query", this.latestUserQuery(request));
    const topK = Math.min(Math.max(OpenAiToolArgumentReader.readOptionalNumber(args, "top_k", 5), 1), 10);
    const documents = await this.ragClient.listDocuments(request.kbId);
    const readyDocuments = documents.filter((document) => document.status === "READY" || document.status === "INDEXED");
    const matchedDocuments = this.rankDocuments(readyDocuments, query).slice(0, topK);
    return {
      output: JSON.stringify({
        ok: matchedDocuments.length > 0,
        status: matchedDocuments.length > 0 ? "hit" : "miss",
        message: matchedDocuments.length > 0 ? "hit" : "miss",
        items: matchedDocuments.map((document) => ({
          id: document.id,
          docName: document.fileName,
          fileType: document.fileType || "",
          fileSize: document.fileSize || 0,
          status: document.status || "",
          snippet: document.fileName
        }))
      }),
      success: true
    };
  }

  private rankDocuments<T extends { fileName: string }>(documents: T[], query: string): T[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return documents;
    }
    const keywords = normalizedQuery.split(/\s+/).filter(Boolean);
    return [...documents].sort((left, right) => this.scoreDocument(right.fileName, keywords) - this.scoreDocument(left.fileName, keywords));
  }

  private scoreDocument(fileName: string, keywords: string[]): number {
    const normalizedName = fileName.toLowerCase();
    return keywords.reduce((score, keyword) => score + (normalizedName.includes(keyword) ? 1 : 0), 0);
  }

  private latestUserQuery(request: ChatStreamRequest): string {
    return request.messages.filter((message) => message.role === "user").at(-1)?.content || "";
  }
}
