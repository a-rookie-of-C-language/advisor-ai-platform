import type { JsonObject } from "../../../../common/json/JsonTypes.js";

export interface ProtocolEvent {
  event: string;
  source: string;
  traceId: string;
  payload: JsonObject;
}
