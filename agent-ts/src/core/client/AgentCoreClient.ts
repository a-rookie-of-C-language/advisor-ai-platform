import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { AgentCoreStreamEvent } from "../model/AgentCoreStreamEvent.js";
import type { AgentCoreStreamChatRequest } from "../model/AgentCoreStreamChatRequest.js";
import type { ProtocolEvent } from "../../protocol/events/model/protocol/ProtocolEvent.js";
import { AgentCoreHealthReporter } from "../health/AgentCoreHealthReporter.js";
import { AgentCoreExecutableLocator } from "../process/locator/AgentCoreExecutableLocator.js";
import { AgentCoreProcessRunner } from "../process/runner/AgentCoreProcessRunner.js";
import { AgentCoreFallbackSerializer } from "../serialization/AgentCoreFallbackSerializer.js";

export class AgentCoreClient {
  private readonly executablePath: string | undefined;
  private readonly fallbackSerializer = new AgentCoreFallbackSerializer();
  private readonly healthReporter: AgentCoreHealthReporter;
  private readonly processRunner: AgentCoreProcessRunner | undefined;

  constructor(explicitPath?: string, enabled = true) {
    this.executablePath = enabled
      ? explicitPath || new AgentCoreExecutableLocator().findDefaultExecutable()
      : undefined;
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

  canStream(): boolean {
    return this.processRunner !== undefined;
  }

  async *streamChat(request: AgentCoreStreamChatRequest): AsyncGenerator<AgentCoreStreamEvent> {
    if (!this.processRunner) {
      throw new Error("agent-core executable not found");
    }

    const input = JSON.stringify({
      url: request.url,
      api_key: request.apiKey,
      model: request.model,
      temperature: request.temperature,
      request_timeout_ms: request.requestTimeoutMs,
      messages: request.messages,
      tools: request.tools ?? []
    });
    for await (const line of this.processRunner.runLines("stream-chat", input)) {
      yield JSON.parse(line) as AgentCoreStreamEvent;
    }
  }

  private runCore(command: string, input: string): Promise<string> {
    if (!this.processRunner) {
      return Promise.reject(new Error("agent-core executable not found"));
    }
    return this.processRunner.run(command, input);
  }
}
