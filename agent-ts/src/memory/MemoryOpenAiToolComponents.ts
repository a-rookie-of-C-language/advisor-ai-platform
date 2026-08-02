import type { MemoryApiClient } from "./api/MemoryApiClient.js";
import { MemoryOpenAiToolDispatcher } from "./MemoryOpenAiToolDispatcher.js";
import { MemoryReadOpenAiToolExecutor } from "./MemoryReadOpenAiToolExecutor.js";
import { MemoryReadRequestReader } from "./MemoryReadRequestReader.js";
import { MemoryToolResultFormatter } from "./MemoryToolResultFormatter.js";
import { MemoryWriteOpenAiToolExecutor } from "./MemoryWriteOpenAiToolExecutor.js";
import { MemoryWriteRequestReader } from "./MemoryWriteRequestReader.js";

export class MemoryOpenAiToolComponents {
  readonly dispatcher: MemoryOpenAiToolDispatcher;

  constructor(
    memoryClient: MemoryApiClient,
    topK: number
  ) {
    const resultFormatter = new MemoryToolResultFormatter();
    this.dispatcher = new MemoryOpenAiToolDispatcher(
      new MemoryReadOpenAiToolExecutor(memoryClient, new MemoryReadRequestReader(topK), resultFormatter),
      new MemoryWriteOpenAiToolExecutor(memoryClient, new MemoryWriteRequestReader(), resultFormatter)
    );
  }
}
