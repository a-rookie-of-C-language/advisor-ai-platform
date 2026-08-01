import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject, JsonValue } from "./JsonTypes.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { RagApiClient } from "./RagApiClient.js";
import { RagOpenAiToolCatalog } from "./RagOpenAiToolCatalog.js";

export class RagOpenAiToolBridge {
  private readonly catalog = new RagOpenAiToolCatalog();
  private readonly toolNames = this.catalog.toolNames();

  constructor(private readonly ragClient: RagApiClient) {}

  listTools(): OpenAIChatTool[] {
    return this.catalog.listTools();
  }

  canExecute(toolName: string): boolean {
    return this.toolNames.has(toolName);
  }

  async executeTool(request: ChatStreamRequest, args: JsonObject): Promise<{ output: string; success: boolean }> {
    if (!request.kbId || request.kbId <= 0) {
      return {
        output: JSON.stringify({ ok: false, status: "error", message: "未选择知识库，无法执行 rag_search", items: [] }),
        success: false
      };
    }

    try {
      const query = this.readOptionalString(args, "query", this.latestUserQuery(request));
      const topK = Math.min(Math.max(this.readOptionalNumber(args, "top_k", 5), 1), 10);
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
    } catch (error) {
      return {
        output: JSON.stringify({
          ok: false,
          status: "error",
          message: error instanceof Error ? error.message : "rag_search failed",
          items: []
        }),
        success: false
      };
    }
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

  private readOptionalString(args: JsonObject, key: string, fallback: string): string {
    const value = this.readAliasedValue(args, key);
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  private readOptionalNumber(args: JsonObject, key: string, fallback: number): number {
    const value = this.readAliasedValue(args, key);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  private readAliasedValue(args: JsonObject, snakeKey: string): JsonValue | undefined {
    const camelKey = snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return args[snakeKey] ?? args[camelKey];
  }
}
