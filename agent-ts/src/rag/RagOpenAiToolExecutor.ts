import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../openai/OpenAiToolArgumentReader.js";
import type { OpenAiToolExecutionResult } from "../openai/OpenAiToolExecutionResult.js";
import { OpenAiToolTopKArgumentReader } from "../openai/OpenAiToolTopKArgumentReader.js";
import type { RagApiClient } from "./RagApiClient.js";
import { RagDocumentRanker } from "./RagDocumentRanker.js";
import { RagSearchToolResultFactory } from "./RagSearchToolResultFactory.js";

export class RagOpenAiToolExecutor {
  private readonly documentRanker = new RagDocumentRanker();
  private readonly resultFactory = new RagSearchToolResultFactory();

  constructor(private readonly ragClient: RagApiClient) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    if (!request.kbId || request.kbId <= 0) {
      throw new Error("未选择知识库，无法执行 rag_search");
    }

    const query = OpenAiToolArgumentReader.readOptionalString(args, "query", this.latestUserQuery(request));
    const topK = OpenAiToolTopKArgumentReader.read(args, 5);
    const documents = await this.ragClient.listDocuments(request.kbId);
    const readyDocuments = documents.filter((document) => document.status === "READY" || document.status === "INDEXED");
    const matchedDocuments = this.documentRanker.rank(readyDocuments, query).slice(0, topK);
    return this.resultFactory.create(matchedDocuments);
  }

  private latestUserQuery(request: ChatStreamRequest): string {
    return request.messages.filter((message) => message.role === "user").at(-1)?.content || "";
  }
}
