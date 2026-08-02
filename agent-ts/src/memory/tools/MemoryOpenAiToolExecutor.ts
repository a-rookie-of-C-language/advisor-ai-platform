import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { JsonObject } from "../../common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { MemoryApiClient } from "../api/MemoryApiClient.js";
import { MemoryOpenAiToolComponents } from "./MemoryOpenAiToolComponents.js";
import { MemoryOpenAiToolComponentsFactory } from "./MemoryOpenAiToolComponentsFactory.js";

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
