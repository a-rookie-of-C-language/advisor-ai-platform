import type { AgentConfig } from "../config/AgentConfig.js";
import type { RagContextBuilder } from "../rag/RagContextBuilder.js";
import { RagContextBuilder as RagContextBuilderClass } from "../rag/RagContextBuilder.js";
import type { RagOpenAiToolBridge } from "../rag/RagOpenAiToolBridge.js";
import { RagOpenAiToolBridge as RagOpenAiToolBridgeClass } from "../rag/RagOpenAiToolBridge.js";
import { AgentRagClientFactory } from "./AgentRagClientFactory.js";

export class AgentRagComponents {
  readonly contextBuilder?: RagContextBuilder;
  readonly openAiToolBridge?: RagOpenAiToolBridge;

  constructor(config: AgentConfig) {
    const ragClient = new AgentRagClientFactory().create(config);
    this.contextBuilder = ragClient ? new RagContextBuilderClass(ragClient) : undefined;
    this.openAiToolBridge = ragClient ? new RagOpenAiToolBridgeClass(ragClient) : undefined;
  }
}
