import type { OpenAIStreamToolCallDelta } from "../../../stream/OpenAIStreamToolCallDelta.js";
import type { OpenAIToolCall } from "../model/OpenAIToolCall.js";

export class OpenAIToolCallDeltaMerger {
  merge(toolCalls: Map<number, OpenAIToolCall>, deltas: OpenAIStreamToolCallDelta[]): void {
    for (const delta of deltas) {
      const index = delta.index ?? 0;
      const current = toolCalls.get(index) || {
        id: "",
        type: "function" as const,
        function: { name: "", arguments: "" }
      };
      current.id += delta.id || "";
      current.function.name += delta.function?.name || "";
      current.function.arguments += delta.function?.arguments || "";
      toolCalls.set(index, current);
    }
  }
}
