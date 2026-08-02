import type { AgentConfig } from "../../config/model/AgentConfig.js";
import type { MemoryContextBuilder } from "../../memory/context/MemoryContextBuilder.js";
import type { MemoryOpenAiToolBridge } from "../../memory/tools/core/MemoryOpenAiToolBridge.js";
import type { MemoryTaskSubmitter } from "../../memory/task/MemoryTaskSubmitter.js";
import { AgentMemoryClientFactory } from "./AgentMemoryClientFactory.js";
import { AgentMemoryFeatureComponentsFactory } from "./AgentMemoryFeatureComponentsFactory.js";

export class AgentMemoryComponents {
  readonly contextBuilder?: MemoryContextBuilder;
  readonly openAiToolBridge?: MemoryOpenAiToolBridge;
  readonly taskSubmitter?: MemoryTaskSubmitter;

  constructor(config: AgentConfig) {
    const memoryClient = new AgentMemoryClientFactory().create(config);
    const components = new AgentMemoryFeatureComponentsFactory().create(memoryClient, config.memoryTopK);
    this.contextBuilder = components.contextBuilder;
    this.openAiToolBridge = components.openAiToolBridge;
    this.taskSubmitter = components.taskSubmitter;
  }
}
