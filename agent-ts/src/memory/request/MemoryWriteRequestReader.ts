import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { JsonObject } from "../../common/json/JsonTypes.js";
import type { MemoryWriteRequest } from "../model/request/tool/MemoryWriteRequest.js";
import { MemoryCandidateReader } from "./MemoryCandidateReader.js";

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
