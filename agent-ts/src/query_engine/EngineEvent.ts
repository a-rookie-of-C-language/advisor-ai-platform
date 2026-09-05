import type { JsonObject } from "../common/json/types/JsonTypes.js";

export interface EngineEventProps {
  readonly event: string;
  readonly source: string;
  readonly payload: JsonObject;
  readonly trace_id?: string | null;
  readonly event_version?: string;
}

export class EngineEvent {
  constructor(
    public readonly event: string,
    public readonly source: string,
    public readonly payload: JsonObject,
    public readonly trace_id: string | null = null,
    public readonly event_version: string = "1.0"
  ) {}

  get traceId(): string | null {
    return this.trace_id;
  }

  get eventVersion(): string {
    return this.event_version;
  }

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
    const body = {
      event_version: this.event_version,
      trace_id: this.trace_id ?? "",
      timestamp: Date.now(),
      source: this.source,
      payload: this.payload
    };
    return `event: ${this.event}\ndata: ${JSON.stringify(body)}\n\n`;
  }
}
