import request from './request'
import { useAuthStore } from '../store/authStore'

export interface ChatSessionDTO {
  id: number
  title: string
  updatedAt: string
}

export interface ChatMessageDTO {
  id: number
  role: 'user' | 'assistant'
  content: string
}

export interface ChatStreamMessageDTO {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface StreamPayload {
  messages: ChatStreamMessageDTO[]
  sessionId: number
  kbId: number
}

interface StreamHandlers {
  onStart?: () => void
  onDelta?: (text: string) => void
  onEnd?: () => void
  onError?: (message: string) => void
}

function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  if (!token) {
    return { 'Content-Type': 'application/json' }
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split('\n').map((line) => line.trimEnd())
  let event = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line) {
      continue
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  if (dataLines.length === 0) {
    return null
  }
  return { event, data: dataLines.join('\n') }
}

export const chatApi = {
  listSessions: () => request.get<unknown, ApiResponse<ChatSessionDTO[]>>('/chat/sessions'),

  createSession: () => request.post<unknown, ApiResponse<ChatSessionDTO>>('/chat/sessions'),

  deleteSession: (id: number) => request.delete<unknown, ApiResponse<null>>(`/chat/sessions/${id}`),

  listMessages: (sessionId: number) =>
    request.get<unknown, ApiResponse<ChatMessageDTO[]>>(`/chat/sessions/${sessionId}/messages`),

  streamChat: async (payload: StreamPayload, handlers: StreamHandlers): Promise<void> => {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })

    if (!response.ok || !response.body) {
      throw new Error(`stream failed: http ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r/g, '')

      let splitIndex = buffer.indexOf('\n\n')
      while (splitIndex >= 0) {
        const rawBlock = buffer.slice(0, splitIndex)
        buffer = buffer.slice(splitIndex + 2)

        const parsed = parseSseBlock(rawBlock)
        if (parsed) {
          try {
            const data = JSON.parse(parsed.data) as { text?: string; message?: string }
            if (parsed.event === 'start') {
              handlers.onStart?.()
            } else if (parsed.event === 'delta' && data.text) {
              handlers.onDelta?.(data.text)
            } else if (parsed.event === 'end') {
              handlers.onEnd?.()
            } else if (parsed.event === 'error') {
              handlers.onError?.(data.message ?? 'stream error')
            }
          } catch {
            if (parsed.event === 'error') {
              handlers.onError?.(parsed.data)
            }
          }
        }

        splitIndex = buffer.indexOf('\n\n')
      }
    }
  },
}


