import type { MemoryApiClient } from "./MemoryApiClient.js";
import { MemoryOpenAiToolCatalog } from "./MemoryOpenAiToolCatalog.js";
import { MemoryOpenAiToolExecutor } from "./MemoryOpenAiToolExecutor.js";

export class MemoryOpenAiToolBridgeComponents {
  readonly catalog = new MemoryOpenAiToolCatalog();
  readonly executor: MemoryOpenAiToolExecutor;

  constructor(
    memoryClient: MemoryApiClient,
    topK: number
  ) {
    this.executor = new MemoryOpenAiToolExecutor(memoryClient, topK);
  }
}
