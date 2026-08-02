import type { ChatStreamRequest } from "../../common/ChatStreamRequest.js";
import type { JsonObject } from "../../common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { MemoryApiClient } from "../api/MemoryApiClient.js";
import type { MemoryReadRequestReader } from "../request/MemoryReadRequestReader.js";
import type { MemoryToolResultFormatter } from "./MemoryToolResultFormatter.js";

export class MemoryReadOpenAiToolExecutor {
  constructor(
    private readonly memoryClient: MemoryApiClient,
    private readonly readRequestReader: MemoryReadRequestReader,
    private readonly resultFormatter: MemoryToolResultFormatter
  ) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    const readRequest = this.readRequestReader.read(request, args);
    const items = await this.memoryClient.searchLongTerm(
      readRequest.userId,
      readRequest.kbId,
      readRequest.query,
      readRequest.topK
    );
    return this.resultFormatter.formatRead(items);
  }
}
