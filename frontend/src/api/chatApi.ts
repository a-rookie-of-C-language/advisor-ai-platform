import request from './request'
import { streamChat } from './chatStreamClient'
import type { StreamEventRecord, StreamSourceItem } from './chatStreamTypes'

export type {
  ChatStreamMessageDTO,
  StreamEventData,
  StreamEventRecord,
  StreamHandlers,
  StreamPayload,
  StreamSourceItem,
  StreamToolResult,
} from './chatStreamTypes'

export interface ChatSessionDTO {
  id: number
  title: string
  kbId?: number
  updatedAt: string
}

export interface ChatMessageDTO {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: StreamSourceItem[]
  events?: StreamEventRecord[]
}

export interface ChatSendResponseDTO {
  id: number
  role: 'assistant'
  content: string
  sources?: StreamSourceItem[]
  events?: StreamEventRecord[]
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export const chatApi = {
  listSessions: () => request.get<unknown, ApiResponse<ChatSessionDTO[]>>('/chat/sessions'),

  createSession: () => request.post<unknown, ApiResponse<ChatSessionDTO>>('/chat/sessions', {}),

  deleteSession: (id: number) => request.delete<unknown, ApiResponse<null>>(`/chat/sessions/${id}`),

  listMessages: (sessionId: number) =>
    request.get<unknown, ApiResponse<ChatMessageDTO[]>>(`/chat/sessions/${sessionId}/messages`),

  sendMessage: (sessionId: number, content: string) =>
    request.post<unknown, ApiResponse<ChatSendResponseDTO>>(`/chat/sessions/${sessionId}/messages`, {
      content,
    }),

  streamChat,
}
