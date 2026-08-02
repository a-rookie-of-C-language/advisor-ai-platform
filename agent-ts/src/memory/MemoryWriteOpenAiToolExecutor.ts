import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import type { MemoryToolResultFormatter } from "./MemoryToolResultFormatter.js";
import type { MemoryWriteRequestReader } from "./MemoryWriteRequestReader.js";

export class MemoryWriteOpenAiToolExecutor {
  constructor(
    private readonly memoryClient: MemoryApiClient,
    private readonly writeRequestReader: MemoryWriteRequestReader,
    private readonly resultFormatter: MemoryToolResultFormatter
  ) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    const writeRequest = this.writeRequestReader.read(request, args);
    const result = await this.memoryClient.upsertCandidates(writeRequest);
    return this.resultFormatter.formatWrite(result);
  }
}
