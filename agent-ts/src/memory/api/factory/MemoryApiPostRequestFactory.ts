import type { JsonObject } from "../../../common/json/JsonTypes.js";
import type { MemoryCandidateUpsertRequest } from "../../model/request/MemoryCandidateUpsertRequest.js";
import type { MemoryTaskSubmitRequest } from "../../model/task/MemoryTaskSubmitRequest.js";

export class MemoryApiPostRequestFactory {
  createLongTermSearch(userId: number, kbId: number, query: string, topK: number): RequestInit {
    return this.createJsonPost({
      userId,
      kbId,
      query,
      topK,
      mode: "hybrid"
    });
  }

  createCandidateUpsert(params: MemoryCandidateUpsertRequest): RequestInit {
    return this.createJsonPost(params as unknown as JsonObject);
  }

  createMemoryTaskSubmit(params: MemoryTaskSubmitRequest): RequestInit {
    return this.createJsonPost(params as unknown as JsonObject);
  }

  private createJsonPost(body: JsonObject): RequestInit {
    return {
      method: "POST",
      body: JSON.stringify(body)
    };
  }
}
