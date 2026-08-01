import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryCandidateReader } from "./MemoryCandidateReader.js";
import { OpenAiToolArgumentReader } from "./OpenAiToolArgumentReader.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";

export class MemoryOpenAiToolExecutor {
  private readonly candidateReader = new MemoryCandidateReader();

  constructor(
    private readonly memoryClient: MemoryApiClient,
    private readonly topK: number
  ) {}

  async execute(
    request: ChatStreamRequest,
    toolName: string,
    args: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    if (toolName === "memory_read") {
      return this.readMemory(request, args);
    }
    if (toolName === "memory_write") {
      return this.writeMemory(request, args);
    }
    throw new Error(`未知 memory 工具: ${toolName}`);
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
    const candidates = this.candidateReader.readCandidates(args);
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
