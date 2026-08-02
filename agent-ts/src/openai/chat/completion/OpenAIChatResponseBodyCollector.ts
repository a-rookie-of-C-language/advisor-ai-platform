import { OpenAIStreamParser } from "../../stream/OpenAIStreamParser.js";
import type { OpenAIToolCall } from "../../tools/runtime/model/OpenAIToolCall.js";
import type { OpenAIChatRoundResult } from "../model/OpenAIChatRoundResult.js";

export class OpenAIChatResponseBodyCollector {
  private readonly streamParser = new OpenAIStreamParser();

  async collect(body: ReadableStream<Uint8Array>): Promise<OpenAIChatRoundResult> {
    const decoder = new TextDecoder();
    const textParts: string[] = [];
    const toolCalls = new Map<number, OpenAIToolCall>();
    let buffer = "";

    for await (const chunk of body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        const parsed = this.streamParser.parseDataLine(line);
        textParts.push(...(parsed.text ? [parsed.text] : []));
        this.streamParser.mergeToolCallDeltas(toolCalls, parsed.toolCalls);
      }
    }

    return {
      textParts,
      toolCalls: [...toolCalls.entries()].sort(([left], [right]) => left - right).map(([, value]) => value)
    };
  }
}
