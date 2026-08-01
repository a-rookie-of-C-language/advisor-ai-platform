import type { OpenAIToolCall } from "./OpenAIToolCall.js";

interface OpenAIStreamChoice {
  delta?: {
    content?: string;
    tool_calls?: OpenAIStreamToolCallDelta[];
  };
}

interface OpenAIStreamChunk {
  choices?: OpenAIStreamChoice[];
}

interface OpenAIStreamToolCallDelta {
  index?: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface ParsedStreamLine {
  text: string;
  toolCalls: OpenAIStreamToolCallDelta[];
}

export class OpenAIStreamParser {
  parseDataLine(line: string): ParsedStreamLine {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      return { text: "", toolCalls: [] };
    }
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") {
      return { text: "", toolCalls: [] };
    }
    const chunk = JSON.parse(data) as OpenAIStreamChunk;
    const delta = chunk.choices?.[0]?.delta;
    return {
      text: delta?.content || "",
      toolCalls: delta?.tool_calls || []
    };
  }

  mergeToolCallDeltas(toolCalls: Map<number, OpenAIToolCall>, deltas: OpenAIStreamToolCallDelta[]): void {
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
