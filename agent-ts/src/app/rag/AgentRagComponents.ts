import type { AgentConfig } from "../../config/model/AgentConfig.js";
import type { RagContextBuilder } from "../../rag/context/RagContextBuilder.js";
import type { RagOpenAiToolBridge } from "../../rag/openAi/RagOpenAiToolBridge.js";
import { AgentRagClientFactory } from "./factory/AgentRagClientFactory.js";
import { AgentRagFeatureComponentsFactory } from "./factory/AgentRagFeatureComponentsFactory.js";

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
