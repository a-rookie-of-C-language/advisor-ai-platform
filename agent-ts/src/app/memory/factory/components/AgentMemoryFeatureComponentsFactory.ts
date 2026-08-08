import type { MemoryApiClient } from "../../../../memory/api/core/MemoryApiClient.js";
import { MemoryContextBuilder as MemoryContextBuilderClass } from "../../../../memory/context/core/MemoryContextBuilder.js";
import { MemoryTaskSubmitter as MemoryTaskSubmitterClass } from "../../../../memory/task/submitter/MemoryTaskSubmitter.js";
import { MemoryOpenAiToolBridge as MemoryOpenAiToolBridgeClass } from "../../../../memory/tools/core/bridge/MemoryOpenAiToolBridge.js";
import { AgentMemoryFeatureComponents } from "../../model/AgentMemoryFeatureComponents.js";

export class AgentMemoryFeatureComponentsFactory {
  create(memoryClient: MemoryApiClient | undefined, topK: number): AgentMemoryFeatureComponents {
    return new AgentMemoryFeatureComponents(
      memoryClient ? new MemoryContextBuilderClass(memoryClient, topK) : undefined,
      memoryClient ? new MemoryOpenAiToolBridgeClass(memoryClient, topK) : undefined,
      memoryClient ? new MemoryTaskSubmitterClass(memoryClient) : undefined
    );
  }
}
