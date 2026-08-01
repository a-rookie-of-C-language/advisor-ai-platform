import type { ChatMessageDTO, ChatStreamRequest } from "./ChatStreamRequest.js";

export function validateChatStreamRequest(body: unknown): ChatStreamRequest {
  if (!isRecord(body)) {
    throw new Error("request body must be an object");
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages must be a non-empty array");
  }

  const validMessages = messages
    .filter(isRecord)
    .map((message) => ({
      role: String(message.role || "").trim(),
      content: String(message.content || "").trim(),
      attachments: Array.isArray(message.attachments) ? message.attachments : null
    }))
    .filter((message) => Boolean(message.role && message.content)) as ChatMessageDTO[];

  if (validMessages.length === 0) {
    throw new Error("no valid messages");
  }

  return {
    messages: validMessages,
    userId: readOptionalNumber(body.userId),
    sessionId: readOptionalNumber(body.sessionId),
    kbId: readOptionalNumber(body.kbId),
    turnId: readOptionalString(body.turnId),
    traceId: readOptionalString(body.traceId),
    attachments: Array.isArray(body.attachments) ? body.attachments : null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
