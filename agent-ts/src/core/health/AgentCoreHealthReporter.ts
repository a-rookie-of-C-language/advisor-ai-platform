import type { JsonObject } from "../../common/JsonTypes.js";
import type { AgentCoreProcessRunner } from "../process/AgentCoreProcessRunner.js";

export class AgentCoreHealthReporter {
  constructor(private readonly processRunner: AgentCoreProcessRunner | undefined) {}

  async report(): Promise<JsonObject> {
    if (!this.processRunner) {
      return { status: "ok", core: "typescript-fallback" };
    }

    try {
      const output = await this.processRunner.run("health", "");
      return JSON.parse(output) as JsonObject;
    } catch {
      return { status: "degraded", core: "typescript-fallback" };
    }
  }
}
