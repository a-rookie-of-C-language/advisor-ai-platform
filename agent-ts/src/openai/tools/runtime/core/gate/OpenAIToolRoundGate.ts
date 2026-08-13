import type { OpenAIChatTool } from "../../../../chat/model/tool/OpenAIChatTool.js";
import type { OpenAIToolCall } from "../../model/call/OpenAIToolCall.js";

export class OpenAIToolRoundGate {
  shouldRun(toolCalls: OpenAIToolCall[], tools: OpenAIChatTool[]): boolean {
    return toolCalls.length > 0 && tools.length > 0;
  }
}
