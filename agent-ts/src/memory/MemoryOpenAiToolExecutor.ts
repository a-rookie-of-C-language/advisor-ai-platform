import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryOpenAiToolDispatcher } from "./MemoryOpenAiToolDispatcher.js";
import { MemoryReadRequestReader } from "./MemoryReadRequestReader.js";
import { MemoryReadOpenAiToolExecutor } from "./MemoryReadOpenAiToolExecutor.js";
import { MemoryToolResultFormatter } from "./MemoryToolResultFormatter.js";
import { MemoryWriteOpenAiToolExecutor } from "./MemoryWriteOpenAiToolExecutor.js";
import { MemoryWriteRequestReader } from "./MemoryWriteRequestReader.js";
import type { OpenAiToolExecutionResult } from "../openai/OpenAiToolExecutionResult.js";

export class MemoryOpenAiToolExecutor {
  private readonly dispatcher: MemoryOpenAiToolDispatcher;
  private readonly readRequestReader: MemoryReadRequestReader;
  private readonly resultFormatter = new MemoryToolResultFormatter();
  private readonly writeRequestReader = new MemoryWriteRequestReader();

  constructor(
    memoryClient: MemoryApiClient,
    topK: number
  ) {
    this.readRequestReader = new MemoryReadRequestReader(topK);
    this.dispatcher = new MemoryOpenAiToolDispatcher(
      new MemoryReadOpenAiToolExecutor(memoryClient, this.readRequestReader, this.resultFormatter),
      new MemoryWriteOpenAiToolExecutor(memoryClient, this.writeRequestReader, this.resultFormatter)
    );
  }

  async execute(
    request: ChatStreamRequest,
    toolName: string,
    args: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    return this.dispatcher.dispatch(request, toolName, args);
  }
}
