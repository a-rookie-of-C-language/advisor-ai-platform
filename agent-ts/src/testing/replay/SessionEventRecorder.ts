import type { AgentLoopEvent } from "../../app/loop/model/AgentLoopOptions.js";
import type { OpenAIChatStreamEvent } from "../../protocol/events/model/openai/OpenAIChatStreamEvent.js";

export type RecordedSessionEvent =
  | { kind: "lifecycle"; event: AgentLoopEvent }
  | { kind: "stream"; event: OpenAIChatStreamEvent };

export class SessionEventRecorder {
  private readonly events: RecordedSessionEvent[] = [];

  recordLifecycle(event: AgentLoopEvent): void {
    this.events.push({ kind: "lifecycle", event: structuredClone(event) });
  }

  recordStream(event: OpenAIChatStreamEvent): void {
    this.events.push({ kind: "stream", event: structuredClone(event) });
  }

  snapshot(): RecordedSessionEvent[] {
    return structuredClone(this.events);
  }
}
