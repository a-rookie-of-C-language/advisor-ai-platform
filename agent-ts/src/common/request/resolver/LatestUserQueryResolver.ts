import type { ChatStreamRequest } from "../../model/ChatStreamRequest.js";

export class LatestUserQueryResolver {
  resolve(request: ChatStreamRequest): string {
    return request.messages.filter((message) => message.role === "user").at(-1)?.content || "";
  }
}
