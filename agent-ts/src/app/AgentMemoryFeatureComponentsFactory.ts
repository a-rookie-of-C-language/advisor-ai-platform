import type { MemoryApiClient } from "../memory/MemoryApiClient.js";
import { MemoryContextBuilder as MemoryContextBuilderClass } from "../memory/MemoryContextBuilder.js";
import { MemoryOpenAiToolBridge as MemoryOpenAiToolBridgeClass } from "../memory/MemoryOpenAiToolBridge.js";
import { MemoryTaskSubmitter as MemoryTaskSubmitterClass } from "../memory/MemoryTaskSubmitter.js";
import { AgentMemoryFeatureComponents } from "./AgentMemoryFeatureComponents.js";

export class AgentMemoryFeatureComponentsFactory {
  create(memoryClient: MemoryApiClient | undefined, topK: number): AgentMemoryFeatureComponents {
    return new AgentMemoryFeatureComponents(
      memoryClient ? new MemoryContextBuilderClass(memoryClient, topK) : undefined,
      memoryClient ? new MemoryOpenAiToolBridgeClass(memoryClient, topK) : undefined,
      memoryClient ? new MemoryTaskSubmitterClass(memoryClient) : undefined
    );
  }
}
