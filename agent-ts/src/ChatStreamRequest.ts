export interface AttachmentDTO {
  id: number;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
}

export interface ChatMessageDTO {
  role: string;
  content: string;
  attachments?: AttachmentDTO[] | null;
}

export interface ChatStreamRequest {
  messages: ChatMessageDTO[];
  userId?: number | null;
  sessionId?: number | null;
  kbId?: number | null;
  turnId?: string | null;
  traceId?: string | null;
  attachments?: AttachmentDTO[] | null;
}
