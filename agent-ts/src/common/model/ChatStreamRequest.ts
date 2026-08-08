import type { AttachmentDTO } from "./AttachmentDTO.js";
import type { ChatMessageDTO } from "./ChatMessageDTO.js";

export type { AttachmentDTO } from "./AttachmentDTO.js";
export type { ChatMessageDTO } from "./ChatMessageDTO.js";

export interface ChatStreamRequest {
  messages: ChatMessageDTO[];
  userId?: number | null;
  sessionId?: number | null;
  kbId?: number | null;
  turnId?: string | null;
  traceId?: string | null;
  attachments?: AttachmentDTO[] | null;
}
