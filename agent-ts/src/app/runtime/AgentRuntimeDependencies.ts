import type { AgentCoreClient } from "../../core/client/AgentCoreClient.js";
import type { OpenAIChatClient } from "../../openai/chat/core/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../../openai/tools/registry/core/OpenAiToolRegistry.js";

export class AgentRuntimeDependencies {
  constructor(
    readonly core: AgentCoreClient,
    readonly openAiClient: OpenAIChatClient,
    readonly openAiToolRegistry: OpenAiToolRegistry
  ) {}
}
