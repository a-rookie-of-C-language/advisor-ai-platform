import { AgentCoreExecutableLocator } from "./AgentCoreExecutableLocator.js";
import { AgentCoreFallbackSerializer } from "./AgentCoreFallbackSerializer.js";
import { AgentCoreProcessRunner } from "./AgentCoreProcessRunner.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { ProtocolEvent } from "../protocol/ProtocolEvent.js";

export class AgentCoreClient {
  private readonly executablePath: string | undefined;
  private readonly fallbackSerializer = new AgentCoreFallbackSerializer();
  private readonly processRunner: AgentCoreProcessRunner | undefined;

  constructor(explicitPath?: string) {
    this.executablePath = explicitPath || new AgentCoreExecutableLocator().findDefaultExecutable();
    this.processRunner = this.executablePath ? new AgentCoreProcessRunner(this.executablePath) : undefined;
  }

  async serializeEvent(event: ProtocolEvent): Promise<string> {
    if (!this.executablePath) {
      return this.fallbackSerializer.serializeEvent(event);
    }

    try {
      return await this.runCore("sse-event", JSON.stringify(event));
    } catch {
      return this.fallbackSerializer.serializeEvent(event);
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
}
