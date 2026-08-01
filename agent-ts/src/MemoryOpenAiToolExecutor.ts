import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryCandidateReader } from "./MemoryCandidateReader.js";
import { MemoryToolResultFormatter } from "./MemoryToolResultFormatter.js";
import { OpenAiToolArgumentReader } from "./OpenAiToolArgumentReader.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";

export class MemoryOpenAiToolExecutor {
  private readonly candidateReader = new MemoryCandidateReader();
  private readonly resultFormatter = new MemoryToolResultFormatter();

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
    return this.resultFormatter.formatRead(items);
  }

  private async writeMemory(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    const userId = this.requireUserId(request);
    const candidates = this.candidateReader.readCandidates(args);
    const result = await this.memoryClient.upsertCandidates({
      userId,
      kbId: request.kbId ?? 0,
      candidates
    });
    return this.resultFormatter.formatWrite(result);
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
