import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import { MemoryOpenAiToolCatalog } from "./MemoryOpenAiToolCatalog.js";
import { OpenAiToolArgumentReader } from "./OpenAiToolArgumentReader.js";
import { OpenAiToolResultFactory } from "./OpenAiToolResultFactory.js";

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
      return OpenAiToolResultFactory.error(error instanceof Error ? error.message : "memory tool failed");
    }
  }

  private async readMemory(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    const userId = this.requireUserId(request);
    const kbId = request.kbId ?? 0;
    const query = OpenAiToolArgumentReader.readOptionalString(args, "query", this.latestUserQuery(request)) || "";
    if (!query.trim()) {
      throw new Error("memory_read empty query");
    }
    const topK = Math.min(Math.max(OpenAiToolArgumentReader.readOptionalNumber(args, "top_k", this.topK), 1), 10);
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
    const value = OpenAiToolArgumentReader.readAliasedValue(args, "candidates");
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("memory_write candidates empty");
    }
    return value
      .map((item) => (item && typeof item === "object" && !Array.isArray(item) ? (item as JsonObject) : {}))
      .map((item) => ({
        content: OpenAiToolArgumentReader.readRequiredString(item, "content"),
        confidence: OpenAiToolArgumentReader.readOptionalNumber(item, "confidence", 0.5),
        sourceTurnId: OpenAiToolArgumentReader.readOptionalString(item, "source_turn_id", null),
        tags: OpenAiToolArgumentReader.readOptionalJsonObject(item, "tags"),
        memoryType: OpenAiToolArgumentReader.readOptionalString(item, "memory_type", null),
        isCore: OpenAiToolArgumentReader.readOptionalBoolean(item, "is_core", null)
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
}
