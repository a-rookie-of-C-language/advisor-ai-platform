import type { MemoryApiClient } from "../../../../api/core/MemoryApiClient.js";
import { MemoryOpenAiToolBridgeComponents } from "../../model/bridge/MemoryOpenAiToolBridgeComponents.js";

export class MemoryOpenAiToolBridgeComponentsFactory {
  create(memoryClient: MemoryApiClient, topK: number): MemoryOpenAiToolBridgeComponents {
    return new MemoryOpenAiToolBridgeComponents(memoryClient, topK);
  }
}
