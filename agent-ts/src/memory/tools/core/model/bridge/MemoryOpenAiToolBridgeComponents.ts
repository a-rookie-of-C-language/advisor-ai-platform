import type { MemoryApiClient } from "../../../../api/core/MemoryApiClient.js";
import { MemoryOpenAiToolCatalog } from "../../../definitions/catalog/core/MemoryOpenAiToolCatalog.js";
import { MemoryOpenAiToolExecutor } from "../../execution/MemoryOpenAiToolExecutor.js";

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
