import type { JsonObject } from "../../../common/json/types/JsonTypes.js";

export class FailureMemoryTraceRecorder {
  readonly events: JsonObject[] = [];

  record(event: string, source: string, payload: JsonObject): void {
    this.events.push({
      event,
      source,
      payload
    });
  }
}
