import type { ProtocolEvent } from "../../protocol/events/ProtocolEvent.js";

export class AgentCoreFallbackSerializer {
  serializeEvent(event: ProtocolEvent): string {
    const envelope = {
      event_version: "1.0",
      trace_id: event.traceId || "",
      timestamp: Date.now(),
      source: event.source || "system",
      payload: event.payload
    };
    return `event: ${event.event}\ndata: ${JSON.stringify(envelope)}\n\n`;
  }
}
