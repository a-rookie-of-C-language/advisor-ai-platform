import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryCandidateReader } from "./MemoryCandidateReader.js";
import { MemoryReadRequestReader } from "./MemoryReadRequestReader.js";
import { MemoryToolResultFormatter } from "./MemoryToolResultFormatter.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";

export class MemoryOpenAiToolExecutor {
  private readonly candidateReader = new MemoryCandidateReader();
  private readonly readRequestReader: MemoryReadRequestReader;
  private readonly resultFormatter = new MemoryToolResultFormatter();

  constructor(
    private readonly memoryClient: MemoryApiClient,
    topK: number
  ) {
    this.readRequestReader = new MemoryReadRequestReader(topK);
  }

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
    const readRequest = this.readRequestReader.read(request, args);
    const items = await this.memoryClient.searchLongTerm(
      readRequest.userId,
      readRequest.kbId,
      readRequest.query,
      readRequest.topK
    );
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
}
