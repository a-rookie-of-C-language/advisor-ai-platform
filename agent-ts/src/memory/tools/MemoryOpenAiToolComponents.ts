import type { MemoryApiClient } from "../api/MemoryApiClient.js";
import { MemoryReadRequestReader } from "../request/MemoryReadRequestReader.js";
import { MemoryWriteRequestReader } from "../request/MemoryWriteRequestReader.js";
import { MemoryOpenAiToolDispatcher } from "./MemoryOpenAiToolDispatcher.js";
import { MemoryReadOpenAiToolExecutor } from "./MemoryReadOpenAiToolExecutor.js";
import { MemoryToolResultFormatter } from "./MemoryToolResultFormatter.js";
import { MemoryWriteOpenAiToolExecutor } from "./MemoryWriteOpenAiToolExecutor.js";

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
