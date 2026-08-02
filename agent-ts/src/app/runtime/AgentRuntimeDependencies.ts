import type { AgentCoreClient } from "../../core/AgentCoreClient.js";
import type { OpenAIChatClient } from "../../openai/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../../openai/tools/registry/OpenAiToolRegistry.js";

export class AgentRuntimeDependencies {
  constructor(
    readonly core: AgentCoreClient,
    readonly openAiClient: OpenAIChatClient,
    readonly openAiToolRegistry: OpenAiToolRegistry
  ) {}
}
