import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { JsonObject } from "../../common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { MemoryReadOpenAiToolExecutor } from "./MemoryReadOpenAiToolExecutor.js";
import type { MemoryWriteOpenAiToolExecutor } from "./MemoryWriteOpenAiToolExecutor.js";

export class MemoryOpenAiToolDispatcher {
  constructor(
    private readonly readToolExecutor: MemoryReadOpenAiToolExecutor,
    private readonly writeToolExecutor: MemoryWriteOpenAiToolExecutor
  ) {}

  async dispatch(
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
