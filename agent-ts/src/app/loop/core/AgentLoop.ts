import type { OpenAIToolCall } from "../../../openai/tools/runtime/model/call/OpenAIToolCall.js";
import { OpenAIToolConversationAppender } from "../../../openai/tools/runtime/state/conversation/OpenAIToolConversationAppender.js";
import type { OpenAIChatStreamEvent } from "../../../protocol/events/model/openai/OpenAIChatStreamEvent.js";
import type { AgentLoopOptions, AgentLoopResult, AgentLoopToolCall, AgentLoopToolResult } from "../model/AgentLoopOptions.js";

export class AgentLoop {
  constructor(private readonly options: AgentLoopOptions) {}

  async run(): Promise<AgentLoopResult> {
    const { onEvent } = this.options;
    await onEvent?.({ type: "agent_start" });
    let conversation = structuredClone(this.options.chatRequest.messages);
    if (this.options.transformContext) {
      conversation = await this.options.transformContext(conversation, this.options.signal);
    }
    let turns = 0;
    let answerText = "";
    let emitted = false;
    const maxTurns = this.options.maxTurns ?? 3;
    const appender = new OpenAIToolConversationAppender();
    while (turns < maxTurns && !this.options.signal?.aborted) {
      turns++;
      await onEvent?.({ type: "turn_start", turn: turns });
      const toolCalls: AgentLoopToolCall[] = [];
      for await (const event of this.options.stream(conversation, this.options.signal)) {
        if (event.type === "delta") {
          emitted = true;
          answerText += event.text;
          await this.options.writer?.(event);
        } else if (event.type === "tool_call") {
          toolCalls.push({ id: event.toolCallId, name: event.toolName, args: event.toolArgs });
          await this.options.writer?.(event);
        }
      }
      if (toolCalls.length === 0) {
        await onEvent?.({ type: "turn_end", turn: turns });
        break;
      }
      const openAiToolCalls: OpenAIToolCall[] = toolCalls.map((toolCall) => ({
        id: toolCall.id,
        type: "function" as const,
        function: { name: toolCall.name, arguments: JSON.stringify(toolCall.args) }
      }));
      appender.appendAssistantToolCalls(conversation as unknown as Parameters<typeof appender.appendAssistantToolCalls>[0], openAiToolCalls);
      for (const toolCall of toolCalls) {
        if (this.options.signal?.aborted) {
          throw new Error("Agent stream aborted");
        }
        const allowed = this.options.beforeToolCall
          ? await this.options.beforeToolCall({ toolCall, signal: this.options.signal })
          : true;
        let result: AgentLoopToolResult;
        if (allowed === false) {
          result = {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            output: JSON.stringify({ ok: false, status: "blocked", message: "tool blocked by policy", items: [] }),
            success: false
          };
        } else {
          const toolResult = await this.options.executeTool(
            this.options.chatRequest,
            toolCall.name,
            toolCall.args,
            this.options.signal
          );
          result = {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            output: toolResult.output,
            success: toolResult.success
          };
          if (this.options.afterToolCall) {
            const rewritten = await this.options.afterToolCall({ toolCall, result, signal: this.options.signal });
            if (rewritten) {
              result = rewritten;
            }
          }
        }
        const openAiToolCall = openAiToolCalls.find((candidate) => candidate.id === toolCall.id);
        if (openAiToolCall) {
          appender.appendToolResult(
            conversation as unknown as Parameters<typeof appender.appendToolResult>[0],
            openAiToolCall,
            result.output
          );
        }
        const writerEvent: OpenAIChatStreamEvent = {
          type: "tool_result",
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          toolOutput: result.output,
          success: result.success
        };
        await this.options.writer?.(writerEvent);
      }
      await onEvent?.({ type: "turn_end", turn: turns });
      if (this.options.transformContext) {
        conversation = await this.options.transformContext(conversation, this.options.signal);
      }
    }
    await onEvent?.({ type: "agent_end", turns, answer: answerText });
    return { answer: answerText, emitted, turns };
  }
}
