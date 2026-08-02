import type { ChatStreamRequest } from "../../../common/model/ChatStreamRequest.js";
import type { MemoryTaskSubmitter } from "../../../memory/task/MemoryTaskSubmitter.js";

export class AgentMemoryTaskCompletionSubmitter {
  constructor(private readonly memoryTaskSubmitter?: MemoryTaskSubmitter) {}

  async submit(chatRequest: ChatStreamRequest, turnId: string, answer: string): Promise<void> {
    if (!this.memoryTaskSubmitter || !turnId || !answer.trim()) {
      return;
    }
    await this.memoryTaskSubmitter.submit(chatRequest, turnId, answer);
  }
}
