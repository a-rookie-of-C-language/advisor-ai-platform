import type { JsonObject } from "../../common/JsonTypes.js";

export interface ProtocolEvent {
  event: string;
  source: string;
  traceId: string;
  payload: JsonObject;
}
