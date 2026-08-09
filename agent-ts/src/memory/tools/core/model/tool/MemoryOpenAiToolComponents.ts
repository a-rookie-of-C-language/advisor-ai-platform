import type { MemoryApiClient } from "../../../../api/core/MemoryApiClient.js";
import { MemoryReadRequestReader } from "../../../../request/tool/read/MemoryReadRequestReader.js";
import { MemoryWriteRequestReader } from "../../../../request/tool/write/MemoryWriteRequestReader.js";
import { MemoryOpenAiToolDispatcher } from "../../../execution/dispatch/MemoryOpenAiToolDispatcher.js";
import { MemoryReadOpenAiToolExecutor } from "../../../execution/executor/read/MemoryReadOpenAiToolExecutor.js";
import { MemoryToolResultFormatter } from "../../../execution/formatting/MemoryToolResultFormatter.js";
import { MemoryWriteOpenAiToolExecutor } from "../../../execution/executor/write/MemoryWriteOpenAiToolExecutor.js";

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
