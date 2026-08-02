import type { ChatStreamRequest } from "../../common/ChatStreamRequest.js";
import type { JsonObject } from "../../common/JsonTypes.js";
import type { OpenAIChatTool } from "../../openai/OpenAIChatTool.js";
import type { OpenAIToolExecutor } from "../../openai/OpenAIToolRoundRunner.js";
import type { AgentOpenAiToolFacade } from "./AgentOpenAiToolFacade.js";

export class AgentToolExecutorFactory {
  constructor(private readonly openAiToolFacade: AgentOpenAiToolFacade) {}

  create(chatRequest: ChatStreamRequest, tools: OpenAIChatTool[]): OpenAIToolExecutor | undefined {
    if (tools.length === 0) {
      return undefined;
    }
    return (toolName: string, toolArgs: JsonObject) => this.openAiToolFacade.executeTool(chatRequest, toolName, toolArgs);
  }
}
