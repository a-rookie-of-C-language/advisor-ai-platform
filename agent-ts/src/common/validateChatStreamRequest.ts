import { ChatMessageListValidator } from "./ChatMessageListValidator.js";
import { ChatStreamRequestFieldReader } from "./ChatStreamRequestFieldReader.js";
import type { ChatStreamRequest } from "./ChatStreamRequest.js";

const fieldReader = new ChatStreamRequestFieldReader();
const messageListValidator = new ChatMessageListValidator();

export function validateChatStreamRequest(body: unknown): ChatStreamRequest {
  if (!isRecord(body)) {
    throw new Error("request body must be an object");
  }

  return {
    messages: messageListValidator.validate(body.messages),
    userId: fieldReader.readOptionalNumber(body.userId),
    sessionId: fieldReader.readOptionalNumber(body.sessionId),
    kbId: fieldReader.readOptionalNumber(body.kbId),
    turnId: fieldReader.readOptionalString(body.turnId),
    traceId: fieldReader.readOptionalString(body.traceId),
    attachments: fieldReader.readOptionalAttachments(body.attachments)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
