import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";

export class MemoryTaskSubmitter {
  constructor(private readonly memoryClient: MemoryApiClient) {}

  async submit(request: ChatStreamRequest, turnId: string, assistantText: string): Promise<void> {
    if (!request.userId || !request.sessionId) {
      return;
    }
    const userText = this.findLastUserMessage(request);
    if (!userText) {
      return;
    }

    try {
      await this.memoryClient.submitMemoryTask({
        userId: request.userId,
        kbId: 0,
        sessionId: request.sessionId,
        turnId,
        userText,
        assistantText,
        recentMessages: [
          ...request.messages.map((message) => ({ role: message.role, content: message.content })),
          { role: "assistant", content: assistantText }
        ]
      });
    } catch {
      // 记忆写回失败不能影响聊天主链路。
    }
  }

  private findLastUserMessage(request: ChatStreamRequest): string {
    const userMessages = request.messages.filter((message) => message.role === "user" && message.content.trim());
    return userMessages.at(-1)?.content.trim() || "";
  }
}
