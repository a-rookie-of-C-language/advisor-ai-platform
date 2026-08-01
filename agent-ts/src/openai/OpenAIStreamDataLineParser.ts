import type { OpenAIParsedStreamLine } from "./OpenAIParsedStreamLine.js";
import type { OpenAIStreamToolCallDelta } from "./OpenAIStreamToolCallDelta.js";

interface OpenAIStreamChoice {
  delta?: {
    content?: string;
    tool_calls?: OpenAIStreamToolCallDelta[];
  };
}

interface OpenAIStreamChunk {
  choices?: OpenAIStreamChoice[];
}

export class OpenAIStreamDataLineParser {
  parse(line: string): OpenAIParsedStreamLine {
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
}
