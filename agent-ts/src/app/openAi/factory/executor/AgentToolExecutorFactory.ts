import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { OpenAIChatTool } from "../../../../openai/chat/model/tool/OpenAIChatTool.js";
import type { OpenAIToolExecutor } from "../../../../openai/tools/runtime/core/runner/OpenAIToolRoundRunner.js";
import type { AgentOpenAiToolFacade } from "../../core/AgentOpenAiToolFacade.js";

export class AgentToolExecutorFactory {
  constructor(private readonly openAiToolFacade: AgentOpenAiToolFacade) {}

  create(chatRequest: ChatStreamRequest, tools: OpenAIChatTool[]): OpenAIToolExecutor | undefined {
    if (tools.length === 0) {
      return undefined;
    }
    return (toolName: string, toolArgs: JsonObject, signal?: AbortSignal) =>
      this.openAiToolFacade.executeTool(chatRequest, toolName, toolArgs, signal);
  }
}
