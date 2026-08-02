import type { MemoryApiClient } from "../api/MemoryApiClient.js";
import { MemoryOpenAiToolComponents } from "./MemoryOpenAiToolComponents.js";

export class MemoryOpenAiToolComponentsFactory {
  create(memoryClient: MemoryApiClient, topK: number): MemoryOpenAiToolComponents {
    return new MemoryOpenAiToolComponents(memoryClient, topK);
  }
}
