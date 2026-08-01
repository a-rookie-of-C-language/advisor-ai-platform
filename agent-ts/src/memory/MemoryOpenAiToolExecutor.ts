import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryReadRequestReader } from "./MemoryReadRequestReader.js";
import { MemoryReadOpenAiToolExecutor } from "./MemoryReadOpenAiToolExecutor.js";
import { MemoryToolResultFormatter } from "./MemoryToolResultFormatter.js";
import { MemoryWriteOpenAiToolExecutor } from "./MemoryWriteOpenAiToolExecutor.js";
import { MemoryWriteRequestReader } from "./MemoryWriteRequestReader.js";
import type { OpenAiToolExecutionResult } from "../openai/OpenAiToolExecutionResult.js";

export class MemoryOpenAiToolExecutor {
  private readonly readToolExecutor: MemoryReadOpenAiToolExecutor;
  private readonly readRequestReader: MemoryReadRequestReader;
  private readonly resultFormatter = new MemoryToolResultFormatter();
  private readonly writeToolExecutor: MemoryWriteOpenAiToolExecutor;
  private readonly writeRequestReader = new MemoryWriteRequestReader();

  constructor(
    memoryClient: MemoryApiClient,
    topK: number
  ) {
    this.readRequestReader = new MemoryReadRequestReader(topK);
    this.readToolExecutor = new MemoryReadOpenAiToolExecutor(memoryClient, this.readRequestReader, this.resultFormatter);
    this.writeToolExecutor = new MemoryWriteOpenAiToolExecutor(memoryClient, this.writeRequestReader, this.resultFormatter);
  }

  async execute(
    request: ChatStreamRequest,
    toolName: string,
    args: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    if (toolName === "memory_read") {
      return this.readToolExecutor.execute(request, args);
    }
    if (toolName === "memory_write") {
      return this.writeToolExecutor.execute(request, args);
    }
    throw new Error(`未知 memory 工具: ${toolName}`);
  }
}
