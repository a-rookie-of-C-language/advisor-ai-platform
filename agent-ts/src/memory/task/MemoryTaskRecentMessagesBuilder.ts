import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";

export class MemoryTaskRecentMessagesBuilder {
  build(request: ChatStreamRequest, assistantText: string): Array<{ role: string; content: string }> {
    return [
      ...request.messages.map((message) => ({ role: message.role, content: message.content })),
      { role: "assistant", content: assistantText }
    ];
  }
}
