import type { ChatMessageDTO } from "../../../common/model/ChatMessageDTO.js";
import type { ContextCompactionResult } from "../model/ContextCompactionResult.js";

export class ContextCompactionService {
  constructor(
    private readonly contextWindowTokens: number,
    private readonly reserveTokens: number,
    private readonly keepLastMessages: number
  ) {}

  compact(messages: ChatMessageDTO[]): ContextCompactionResult {
    const tokensBefore = this.estimateTokens(messages);
    const budget = Math.max(1, this.contextWindowTokens - this.reserveTokens);
    if (tokensBefore <= budget) {
      return {
        messages,
        tokensBefore,
        tokensAfter: tokensBefore,
        tokensReleased: 0,
        compacted: false,
        droppedMessages: 0
      };
    }

    const systemMessages = messages.filter((message) => message.role === "system");
    const nonSystemMessages = messages.filter((message) => message.role !== "system");
    const recentMessages = nonSystemMessages.slice(-Math.max(1, this.keepLastMessages));
    const droppedMessages = nonSystemMessages.length - recentMessages.length;
    const compactedMessages: ChatMessageDTO[] = [
      ...systemMessages,
      ...(droppedMessages > 0
        ? [{
            role: "system",
            content: `[历史上下文已压缩：省略 ${droppedMessages} 条较早消息，请以当前上下文为准。]`
          }]
        : []),
      ...recentMessages
    ];
    const tokensAfter = this.estimateTokens(compactedMessages);
    return {
      messages: compactedMessages,
      tokensBefore,
      tokensAfter,
      tokensReleased: Math.max(0, tokensBefore - tokensAfter),
      compacted: true,
      droppedMessages
    };
  }

  private estimateTokens(messages: ChatMessageDTO[]): number {
    return messages.reduce((total, message) => total + Math.max(1, Math.ceil(message.content.length / 4)), 0);
  }
}
