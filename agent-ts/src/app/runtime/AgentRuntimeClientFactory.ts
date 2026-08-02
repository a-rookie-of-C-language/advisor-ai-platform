import type { AgentConfig } from "../../config/model/AgentConfig.js";
import { AgentCoreClient } from "../../core/AgentCoreClient.js";
import { OpenAIChatClient } from "../../openai/chat/OpenAIChatClient.js";

export class AgentRuntimeClientFactory {
  createCoreClient(config: AgentConfig): AgentCoreClient {
    return new AgentCoreClient(config.rustCorePath);
  }

  createOpenAiClient(config: AgentConfig): OpenAIChatClient {
    return new OpenAIChatClient(config);
  }
}
