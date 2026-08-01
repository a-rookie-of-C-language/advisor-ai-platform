import type { JsonObject } from "./JsonTypes.js";

export interface ProtocolEvent {
  event: string;
  source: string;
  traceId: string;
  payload: JsonObject;
}
