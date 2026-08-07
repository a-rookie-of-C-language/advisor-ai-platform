import type { OpenAIParsedStreamLine } from "../model/OpenAIParsedStreamLine.js";
import { OpenAIStreamDataLineParser } from "../parsing/OpenAIStreamDataLineParser.js";
import type { OpenAIStreamToolCallDelta } from "../model/OpenAIStreamToolCallDelta.js";
import type { OpenAIToolCall } from "../../tools/runtime/model/OpenAIToolCall.js";
import { OpenAIToolCallDeltaMerger } from "../../tools/runtime/state/OpenAIToolCallDeltaMerger.js";

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
