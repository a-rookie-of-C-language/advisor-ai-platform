import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject, JsonValue } from "./JsonTypes.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import { MemoryOpenAiToolCatalog } from "./MemoryOpenAiToolCatalog.js";

interface MemoryCandidateInput {
  content: string;
  confidence?: number;
  sourceTurnId?: string | null;
  tags?: JsonObject | null;
  memoryType?: string | null;
  isCore?: boolean | null;
}

export class MemoryOpenAiToolBridge {
  private readonly catalog = new MemoryOpenAiToolCatalog();
  private readonly toolNames = this.catalog.toolNames();

  constructor(
    private readonly memoryClient: MemoryApiClient,
    private readonly topK: number
  ) {}

  listTools(): OpenAIChatTool[] {
    return this.catalog.listTools();
  }

  canExecute(toolName: string): boolean {
    return this.toolNames.has(toolName);
  }

  async executeTool(
    request: ChatStreamRequest,
    toolName: string,
    args: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    try {
      if (toolName === "memory_read") {
        return await this.readMemory(request, args);
      }
      if (toolName === "memory_write") {
        return await this.writeMemory(request, args);
      }
      throw new Error(`未知 memory 工具: ${toolName}`);
    } catch (error) {
      return {
        output: JSON.stringify({
          ok: false,
          status: "error",
          message: error instanceof Error ? error.message : "memory tool failed",
          items: []
        }),
        success: false
      };
    }
  }

  private async readMemory(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    const userId = this.requireUserId(request);
    const kbId = request.kbId ?? 0;
    const query = this.readOptionalString(args, "query", this.latestUserQuery(request)) || "";
    if (!query.trim()) {
      throw new Error("memory_read empty query");
    }
    const topK = Math.min(Math.max(this.readOptionalNumber(args, "top_k", this.topK), 1), 10);
    const items = await this.memoryClient.searchLongTerm(userId, kbId, query, topK);
    return {
      output: JSON.stringify({
        ok: items.length > 0,
        status: items.length > 0 ? "hit" : "miss",
        message: items.length > 0 ? "hit" : "miss",
        items: items.map((item) => ({
          id: item.id,
          content: item.content,
          confidence: item.confidence,
          score: item.score,
          tags: item.tags || {}
        }))
      }),
      success: true
    };
  }

  private async writeMemory(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    const userId = this.requireUserId(request);
    const candidates = this.readCandidates(args);
    const result = await this.memoryClient.upsertCandidates({
      userId,
      kbId: request.kbId ?? 0,
      candidates
    });
    return {
      output: JSON.stringify({
        ok: true,
        status: "ok",
        message: typeof result.message === "string" ? result.message : "memory_write_done",
        items: [],
        meta: {
          accepted: typeof result.accepted === "number" ? result.accepted : 0,
          rejected: typeof result.rejected === "number" ? result.rejected : 0
        }
      }),
      success: true
    };
  }

  private readCandidates(args: JsonObject): MemoryCandidateInput[] {
    const value = this.readAliasedValue(args, "candidates");
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("memory_write candidates empty");
    }
    return value
      .map((item) => (item && typeof item === "object" && !Array.isArray(item) ? (item as JsonObject) : {}))
      .map((item) => ({
        content: this.readRequiredString(item, "content"),
        confidence: this.readOptionalNumber(item, "confidence", 0.5),
        sourceTurnId: this.readOptionalString(item, "source_turn_id", null),
        tags: this.readOptionalJsonObject(item, "tags"),
        memoryType: this.readOptionalString(item, "memory_type", null),
        isCore: this.readOptionalBoolean(item, "is_core", null)
      }));
  }

  private requireUserId(request: ChatStreamRequest): number {
    if (!request.userId) {
      throw new Error("memory tool missing user_id");
    }
    return request.userId;
  }

  private latestUserQuery(request: ChatStreamRequest): string {
    return request.messages.filter((message) => message.role === "user").at(-1)?.content || "";
  }

  private readRequiredString(args: JsonObject, key: string): string {
    const value = this.readAliasedValue(args, key);
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`缺少必填字段: ${key}`);
    }
    return value.trim();
  }

  private readOptionalString(args: JsonObject, key: string, fallback: string | null): string | null {
    const value = this.readAliasedValue(args, key);
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  private readOptionalNumber(args: JsonObject, key: string, fallback: number): number {
    const value = this.readAliasedValue(args, key);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value) {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  private readOptionalBoolean(args: JsonObject, key: string, fallback: boolean | null): boolean | null {
    const value = this.readAliasedValue(args, key);
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string" && value) {
      return ["1", "true", "yes", "y"].includes(value.toLowerCase());
    }
    return fallback;
  }

  private readOptionalJsonObject(args: JsonObject, key: string): JsonObject | null {
    const value = this.readAliasedValue(args, key);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : null;
  }

  private readAliasedValue(args: JsonObject, snakeKey: string): JsonValue | undefined {
    const camelKey = snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return args[snakeKey] ?? args[camelKey];
  }
}
