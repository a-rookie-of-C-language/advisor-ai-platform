import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import { MemoryCandidateReader } from "./MemoryCandidateReader.js";
import type { MemoryWriteRequest } from "./MemoryWriteRequest.js";

export class MemoryWriteRequestReader {
  private readonly candidateReader = new MemoryCandidateReader();

  read(request: ChatStreamRequest, args: JsonObject): MemoryWriteRequest {
    return {
      userId: this.requireUserId(request),
      kbId: request.kbId ?? 0,
      candidates: this.candidateReader.readCandidates(args)
    };
  }

  private requireUserId(request: ChatStreamRequest): number {
    if (!request.userId) {
      throw new Error("memory tool missing user_id");
    }
    return request.userId;
  }
}
