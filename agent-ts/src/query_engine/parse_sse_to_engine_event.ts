import type { JsonObject } from "../common/json/types/JsonTypes.js";
import { EngineEvent } from "./EngineEvent.js";

export function parseSseToEngineEvent(rawEvent: string): EngineEvent {
  const lines = rawEvent.replace(/\r/g, "").split("\n");
  let eventName = "";
  let dataLine = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLine = line.slice(5).trim();
    }
  }

  if (!eventName) {
    throw new Error("invalid sse event: missing event name");
  }
  if (!dataLine) {
    throw new Error("invalid sse event: missing data");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLine);
  } catch {
    throw new Error("invalid sse event: data is not json");
  }

  const payload = typeof parsed === "object" && parsed !== null ? parsed : {};
  const record = payload as Record<string, unknown>;
  return new EngineEvent(
    eventName,
    typeof record.source === "string" ? record.source : "system",
    typeof record.payload === "object" && record.payload !== null ? (record.payload as JsonObject) : {},
    typeof record.traceId === "string" ? record.traceId : null,
    typeof record.eventVersion === "string" ? record.eventVersion : "1.0"
  );
}
