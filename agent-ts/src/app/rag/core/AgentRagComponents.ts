import type { AgentConfig } from "../../../config/model/core/AgentConfig.js";
import type { RagContextBuilder } from "../../../rag/context/core/RagContextBuilder.js";
import type { RagOpenAiToolBridge } from "../../../rag/openAi/bridge/RagOpenAiToolBridge.js";
import { AgentRagClientFactory } from "../factory/client/AgentRagClientFactory.js";
import { AgentRagFeatureComponentsFactory } from "../factory/components/AgentRagFeatureComponentsFactory.js";

export class AgentRagComponents {
  readonly contextBuilder?: RagContextBuilder;
  readonly openAiToolBridge?: RagOpenAiToolBridge;

  constructor(config: AgentConfig) {
    const ragClient = new AgentRagClientFactory().create(config);
    const components = new AgentRagFeatureComponentsFactory().create(ragClient);
    this.contextBuilder = components.contextBuilder;
    this.openAiToolBridge = components.openAiToolBridge;
  }
}
