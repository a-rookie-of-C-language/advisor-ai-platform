import type { MemoryApiClient } from "../../../../api/core/MemoryApiClient.js";
import { MemoryOpenAiToolComponents } from "../../model/tool/MemoryOpenAiToolComponents.js";

export class MemoryOpenAiToolComponentsFactory {
  create(memoryClient: MemoryApiClient, topK: number): MemoryOpenAiToolComponents {
    return new MemoryOpenAiToolComponents(memoryClient, topK);
  }
}
