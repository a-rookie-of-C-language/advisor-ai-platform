import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { JsonObject } from "../../common/json/JsonTypes.js";
import type { OpenAIChatTool } from "../../openai/chat/model/OpenAIChatTool.js";
import type { OpenAiToolExecutionResult } from "../../openai/tools/runtime/model/OpenAiToolExecutionResult.js";
import type { OpenAiToolRegistry } from "../../openai/tools/registry/core/OpenAiToolRegistry.js";
import { OpenAiToolResultFactory } from "../../openai/tools/runtime/factory/OpenAiToolResultFactory.js";

export class AgentOpenAiToolFacade {
  constructor(
    private readonly openAiApiKey: string,
    private readonly openAiToolRegistry?: OpenAiToolRegistry
  ) {}

  async listTools(): Promise<OpenAIChatTool[]> {
    if (!this.openAiApiKey || !this.openAiToolRegistry) {
      return [];
    }
    return this.openAiToolRegistry.listTools();
  }

  async executeTool(
    chatRequest: ChatStreamRequest,
    toolName: string,
    toolArgs: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    return this.openAiToolRegistry
      ? this.openAiToolRegistry.executeTool(chatRequest, toolName, toolArgs)
      : OpenAiToolResultFactory.error(`未知工具: ${toolName}`);
  }
}
