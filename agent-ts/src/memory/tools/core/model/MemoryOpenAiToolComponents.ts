import type { MemoryApiClient } from "../../../api/core/MemoryApiClient.js";
import { MemoryReadRequestReader } from "../../../request/MemoryReadRequestReader.js";
import { MemoryWriteRequestReader } from "../../../request/MemoryWriteRequestReader.js";
import { MemoryOpenAiToolDispatcher } from "../../execution/dispatch/MemoryOpenAiToolDispatcher.js";
import { MemoryReadOpenAiToolExecutor } from "../../execution/executor/MemoryReadOpenAiToolExecutor.js";
import { MemoryToolResultFormatter } from "../../execution/formatting/MemoryToolResultFormatter.js";
import { MemoryWriteOpenAiToolExecutor } from "../../execution/executor/MemoryWriteOpenAiToolExecutor.js";

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
