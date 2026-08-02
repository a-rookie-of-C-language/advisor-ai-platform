import type { JsonObject } from "../../common/JsonTypes.js";
import type { MemoryCandidateUpsertRequest } from "../MemoryCandidateUpsertRequest.js";
import type { MemoryTaskSubmitRequest } from "../MemoryTaskSubmitRequest.js";

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
