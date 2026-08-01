import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { OpenAIChatTool } from "../openai/OpenAIChatTool.js";
import type { OpenAiToolExecutionResult } from "../openai/OpenAiToolExecutionResult.js";
import type { OpenAiToolRegistry } from "../openai/OpenAiToolRegistry.js";
import { OpenAiToolResultFactory } from "../openai/OpenAiToolResultFactory.js";

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
