import type { JsonObject } from "../../common/JsonTypes.js";
import type { ProtocolEvent } from "../../protocol/ProtocolEvent.js";
import { AgentCoreHealthReporter } from "../health/AgentCoreHealthReporter.js";
import { AgentCoreExecutableLocator } from "../process/AgentCoreExecutableLocator.js";
import { AgentCoreProcessRunner } from "../process/AgentCoreProcessRunner.js";
import { AgentCoreFallbackSerializer } from "../serialization/AgentCoreFallbackSerializer.js";

export class AgentCoreClient {
  private readonly executablePath: string | undefined;
  private readonly fallbackSerializer = new AgentCoreFallbackSerializer();
  private readonly healthReporter: AgentCoreHealthReporter;
  private readonly processRunner: AgentCoreProcessRunner | undefined;

  constructor(explicitPath?: string) {
    this.executablePath = explicitPath || new AgentCoreExecutableLocator().findDefaultExecutable();
    this.processRunner = this.executablePath ? new AgentCoreProcessRunner(this.executablePath) : undefined;
    this.healthReporter = new AgentCoreHealthReporter(this.processRunner);
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
    return this.healthReporter.report();
  }

  private runCore(command: string, input: string): Promise<string> {
    if (!this.processRunner) {
      return Promise.reject(new Error("agent-core executable not found"));
    }
    return this.processRunner.run(command, input);
  }
}
