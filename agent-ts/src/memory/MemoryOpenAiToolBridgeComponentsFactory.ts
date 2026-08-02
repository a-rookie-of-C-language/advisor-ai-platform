import type { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryOpenAiToolBridgeComponents } from "./MemoryOpenAiToolBridgeComponents.js";

export class MemoryOpenAiToolBridgeComponentsFactory {
  create(memoryClient: MemoryApiClient, topK: number): MemoryOpenAiToolBridgeComponents {
    return new MemoryOpenAiToolBridgeComponents(memoryClient, topK);
  }
}
