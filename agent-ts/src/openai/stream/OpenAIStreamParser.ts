import type { OpenAIParsedStreamLine } from "./OpenAIParsedStreamLine.js";
import { OpenAIStreamDataLineParser } from "./OpenAIStreamDataLineParser.js";
import type { OpenAIStreamToolCallDelta } from "./OpenAIStreamToolCallDelta.js";
import type { OpenAIToolCall } from "../tools/runtime/OpenAIToolCall.js";
import { OpenAIToolCallDeltaMerger } from "../tools/runtime/OpenAIToolCallDeltaMerger.js";

export class OpenAIStreamParser {
  private readonly dataLineParser = new OpenAIStreamDataLineParser();
  private readonly toolCallDeltaMerger = new OpenAIToolCallDeltaMerger();

  parseDataLine(line: string): OpenAIParsedStreamLine {
    return this.dataLineParser.parse(line);
  }

  mergeToolCallDeltas(toolCalls: Map<number, OpenAIToolCall>, deltas: OpenAIStreamToolCallDelta[]): void {
    this.toolCallDeltaMerger.merge(toolCalls, deltas);
  }
}
