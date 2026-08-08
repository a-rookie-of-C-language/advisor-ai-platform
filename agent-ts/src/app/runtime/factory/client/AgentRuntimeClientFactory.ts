import type { AgentConfig } from "../../../../config/model/AgentConfig.js";
import { AgentCoreClient } from "../../../../core/client/AgentCoreClient.js";
import { OpenAIChatClient } from "../../../../openai/chat/core/client/OpenAIChatClient.js";

export class AgentRuntimeClientFactory {
  createCoreClient(config: AgentConfig): AgentCoreClient {
    return new AgentCoreClient(config.rustCorePath);
  }

  createOpenAiClient(config: AgentConfig): OpenAIChatClient {
    return new OpenAIChatClient(config);
  }
}
