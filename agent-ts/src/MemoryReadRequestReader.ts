import type { ChatStreamRequest } from "./common/ChatStreamRequest.js";
import type { JsonObject } from "./common/JsonTypes.js";
import type { MemoryReadRequest } from "./MemoryReadRequest.js";
import { OpenAiToolArgumentReader } from "./openai/OpenAiToolArgumentReader.js";

export class MemoryReadRequestReader {
  constructor(private readonly defaultTopK: number) {}

  read(request: ChatStreamRequest, args: JsonObject): MemoryReadRequest {
    const userId = this.requireUserId(request);
    const query = OpenAiToolArgumentReader.readOptionalString(args, "query", this.latestUserQuery(request)) || "";
    if (!query.trim()) {
      throw new Error("memory_read empty query");
    }
    return {
      userId,
      kbId: request.kbId ?? 0,
      query,
      topK: this.readTopK(args)
    };
  }

  private readTopK(args: JsonObject): number {
    return Math.min(Math.max(OpenAiToolArgumentReader.readOptionalNumber(args, "top_k", this.defaultTopK), 1), 10);
  }

  private requireUserId(request: ChatStreamRequest): number {
    if (!request.userId) {
      throw new Error("memory tool missing user_id");
    }
    return request.userId;
  }

  private latestUserQuery(request: ChatStreamRequest): string {
    return request.messages.filter((message) => message.role === "user").at(-1)?.content || "";
  }
}
