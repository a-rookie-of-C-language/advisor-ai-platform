import type { ServerResponse } from "node:http";
import type { AgentCoreClient } from "../../../core/client/AgentCoreClient.js";
import { SseWriter } from "../writer/SseWriter.js";

export class SseWriterFactory {
  create(response: ServerResponse, core: AgentCoreClient, traceId: string): SseWriter {
    return new SseWriter(response, core, traceId);
  }
}
