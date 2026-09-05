import type { JsonObject } from "../common/json/types/JsonTypes.js";

export interface EngineEventProps {
  readonly event: string;
  readonly source: string;
  readonly payload: JsonObject;
  readonly traceId?: string | null;
  readonly eventVersion?: string;
}

export class EngineEvent {
  constructor(
    public readonly event: string,
    public readonly source: string,
    public readonly payload: JsonObject,
    public readonly traceId: string | null = null,
    public readonly eventVersion: string = "1.0"
  ) {}

  static llmDelta(text: string, traceId?: string | null): EngineEvent {
    return new EngineEvent("llm_data", "llm", { text }, traceId ?? null);
  }

  static toolUse(
    toolName: string,
    toolCallId: string,
    inputPayload: JsonObject,
    traceId?: string | null
  ): EngineEvent {
    return new EngineEvent(
      "tool_use",
      "tool",
      { tool_name: toolName, tool_call_id: toolCallId, input: inputPayload },
      traceId ?? null
    );
  }

  static toolResult(payload: JsonObject, traceId?: string | null): EngineEvent {
    return new EngineEvent("tool_result", "tool", payload, traceId ?? null);
  }

  static toolError(payload: JsonObject, traceId?: string | null): EngineEvent {
    return new EngineEvent("tool_error", "tool", payload, traceId ?? null);
  }

  static sysDone(finishReason: string, traceId?: string | null): EngineEvent {
    return new EngineEvent("sys_done", "system", { finish_reason: finishReason }, traceId ?? null);
  }

  static sysError(code: string, message: string, retryable: boolean, traceId?: string | null): EngineEvent {
    return new EngineEvent("sys_error", "system", { code, message, retryable }, traceId ?? null);
  }

  toSse(): string {
    const event: EngineEventProps = {
      event: this.event,
      source: this.source,
      payload: this.payload,
      traceId: this.traceId ?? null,
      eventVersion: this.eventVersion
    };
    return `event: ${this.event}\ndata: ${JSON.stringify(event)}\n\n`;
  }
}
