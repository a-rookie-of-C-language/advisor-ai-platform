import type { OpenAIToolCall } from "./OpenAIToolCall.js";
import type { OpenAIToolExecutor } from "./OpenAIToolRoundRunner.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";

export class OpenAIToolRoundGate {
  shouldRun(toolCalls: OpenAIToolCall[], tools: OpenAIChatTool[], toolExecutor?: OpenAIToolExecutor): boolean {
    return toolCalls.length > 0 && tools.length > 0 && Boolean(toolExecutor);
  }
}
