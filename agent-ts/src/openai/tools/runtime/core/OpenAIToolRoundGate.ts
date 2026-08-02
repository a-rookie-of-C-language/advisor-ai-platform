import type { OpenAIChatTool } from "../../../chat/model/OpenAIChatTool.js";
import type { OpenAIToolExecutor } from "./OpenAIToolRoundRunner.js";
import type { OpenAIToolCall } from "../model/OpenAIToolCall.js";

export class OpenAIToolRoundGate {
  shouldRun(toolCalls: OpenAIToolCall[], tools: OpenAIChatTool[], toolExecutor?: OpenAIToolExecutor): boolean {
    return toolCalls.length > 0 && tools.length > 0 && Boolean(toolExecutor);
  }
}
