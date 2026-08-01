import { AgentCoreExecutableLocator } from "./AgentCoreExecutableLocator.js";
import { AgentCoreProcessRunner } from "./AgentCoreProcessRunner.js";
import type { JsonObject } from "./JsonTypes.js";
import type { ProtocolEvent } from "./ProtocolEvent.js";

export class AgentCoreClient {
  private readonly executablePath: string | undefined;
  private readonly processRunner: AgentCoreProcessRunner | undefined;

  constructor(explicitPath?: string) {
    this.executablePath = explicitPath || new AgentCoreExecutableLocator().findDefaultExecutable();
    this.processRunner = this.executablePath ? new AgentCoreProcessRunner(this.executablePath) : undefined;
  }

  async serializeEvent(event: ProtocolEvent): Promise<string> {
    if (!this.executablePath) {
      return this.serializeEventInTs(event);
    }

    try {
      return await this.runCore("sse-event", JSON.stringify(event));
    } catch {
      return this.serializeEventInTs(event);
    }
  }

  async health(): Promise<JsonObject> {
    if (!this.executablePath) {
      return { status: "ok", core: "typescript-fallback" };
    }

    try {
      const output = await this.runCore("health", "");
      return JSON.parse(output) as JsonObject;
    } catch {
      return { status: "degraded", core: "typescript-fallback" };
    }
  }

  private runCore(command: string, input: string): Promise<string> {
    if (!this.processRunner) {
      return Promise.reject(new Error("agent-core executable not found"));
    }
    return this.processRunner.run(command, input);
  }

  private serializeEventInTs(event: ProtocolEvent): string {
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
