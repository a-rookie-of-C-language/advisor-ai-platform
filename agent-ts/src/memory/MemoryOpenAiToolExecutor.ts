import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryReadRequestReader } from "./MemoryReadRequestReader.js";
import { MemoryToolResultFormatter } from "./MemoryToolResultFormatter.js";
import { MemoryWriteRequestReader } from "./MemoryWriteRequestReader.js";
import type { OpenAiToolExecutionResult } from "../openai/OpenAiToolExecutionResult.js";

export class MemoryOpenAiToolExecutor {
  private readonly readRequestReader: MemoryReadRequestReader;
  private readonly resultFormatter = new MemoryToolResultFormatter();
  private readonly writeRequestReader = new MemoryWriteRequestReader();

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
    const writeRequest = this.writeRequestReader.read(request, args);
    const result = await this.memoryClient.upsertCandidates(writeRequest);
    return this.resultFormatter.formatWrite(result);
  }
}
