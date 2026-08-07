import type { MemoryApiClient } from "../../../api/MemoryApiClient.js";
import { MemoryOpenAiToolBridgeComponents } from "../model/MemoryOpenAiToolBridgeComponents.js";

export class MemoryOpenAiToolBridgeComponentsFactory {
  create(memoryClient: MemoryApiClient, topK: number): MemoryOpenAiToolBridgeComponents {
    return new MemoryOpenAiToolBridgeComponents(memoryClient, topK);
  }
}
