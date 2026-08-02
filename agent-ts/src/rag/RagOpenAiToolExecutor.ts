import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { LatestUserQueryResolver } from "../common/LatestUserQueryResolver.js";
import { OpenAiToolArgumentReader } from "../openai/tools/arguments/OpenAiToolArgumentReader.js";
import type { OpenAiToolExecutionResult } from "../openai/tools/runtime/OpenAiToolExecutionResult.js";
import { OpenAiToolTopKArgumentReader } from "../openai/tools/arguments/OpenAiToolTopKArgumentReader.js";
import type { RagApiClient } from "./RagApiClient.js";
import { RagDocumentRanker } from "./RagDocumentRanker.js";
import { RagReadyDocumentSelector } from "./RagReadyDocumentSelector.js";
import { RagSearchToolResultFactory } from "./RagSearchToolResultFactory.js";

export class RagOpenAiToolExecutor {
  private readonly documentRanker = new RagDocumentRanker();
  private readonly latestUserQueryResolver = new LatestUserQueryResolver();
  private readonly readyDocumentSelector = new RagReadyDocumentSelector();
  private readonly resultFactory = new RagSearchToolResultFactory();

  constructor(private readonly ragClient: RagApiClient) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    if (!request.kbId || request.kbId <= 0) {
      throw new Error("未选择知识库，无法执行 rag_search");
    }

    const query = OpenAiToolArgumentReader.readOptionalString(args, "query", this.latestUserQueryResolver.resolve(request));
    const topK = OpenAiToolTopKArgumentReader.read(args, 5);
    const documents = await this.ragClient.listDocuments(request.kbId);
    const readyDocuments = this.readyDocumentSelector.select(documents);
    const matchedDocuments = this.documentRanker.rank(readyDocuments, query).slice(0, topK);
    return this.resultFactory.create(matchedDocuments);
  }
}
