import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { OpenAiToolExecutionResult } from "../../../../openai/tools/runtime/model/OpenAiToolExecutionResult.js";
import type { MemoryApiClient } from "../../../api/core/MemoryApiClient.js";
import { MemoryOpenAiToolComponentsFactory } from "../factory/tool/MemoryOpenAiToolComponentsFactory.js";
import type { MemoryOpenAiToolComponents } from "../model/tool/MemoryOpenAiToolComponents.js";

export class MemoryOpenAiToolExecutor {
  private readonly components: MemoryOpenAiToolComponents;
  private readonly componentsFactory = new MemoryOpenAiToolComponentsFactory();

  constructor(
    memoryClient: MemoryApiClient,
    topK: number
  ) {
    this.components = this.componentsFactory.create(memoryClient, topK);
  }

  async execute(
    request: ChatStreamRequest,
    toolName: string,
    args: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    return this.components.dispatcher.dispatch(request, toolName, args);
  }
}
