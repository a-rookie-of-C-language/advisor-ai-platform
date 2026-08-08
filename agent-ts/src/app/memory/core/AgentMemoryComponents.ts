import type { AgentConfig } from "../../../config/model/core/AgentConfig.js";
import type { MemoryContextBuilder } from "../../../memory/context/core/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../../../memory/task/submitter/MemoryTaskSubmitter.js";
import type { MemoryOpenAiToolBridge } from "../../../memory/tools/core/bridge/MemoryOpenAiToolBridge.js";
import { AgentMemoryClientFactory } from "../factory/AgentMemoryClientFactory.js";
import { AgentMemoryFeatureComponentsFactory } from "../factory/AgentMemoryFeatureComponentsFactory.js";

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
