import { ChatMessageListValidator } from "./ChatMessageListValidator.js";
import type { ChatStreamRequest } from "./ChatStreamRequest.js";

const messageListValidator = new ChatMessageListValidator();

export function validateChatStreamRequest(body: unknown): ChatStreamRequest {
  if (!isRecord(body)) {
    throw new Error("request body must be an object");
  }

  return {
    messages: messageListValidator.validate(body.messages),
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
