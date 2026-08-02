import type { ChatMessageDTO } from "../model/ChatStreamRequest.js";

export class ChatMessageListValidator {
  validate(messages: unknown): ChatMessageDTO[] {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages must be a non-empty array");
    }

    const validMessages = messages
      .filter(this.isRecord)
      .map((message) => ({
        role: String(message.role || "").trim(),
        content: String(message.content || "").trim(),
        attachments: Array.isArray(message.attachments) ? message.attachments : null
      }))
      .filter((message) => Boolean(message.role && message.content)) as ChatMessageDTO[];

    if (validMessages.length === 0) {
      throw new Error("no valid messages");
    }

    return validMessages;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}
