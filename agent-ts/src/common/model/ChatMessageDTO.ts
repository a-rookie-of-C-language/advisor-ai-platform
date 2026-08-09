import type { AttachmentDTO } from "./AttachmentDTO.js";

export interface ChatMessageDTO {
  role: string;
  content: string;
  attachments?: AttachmentDTO[] | null;
}
