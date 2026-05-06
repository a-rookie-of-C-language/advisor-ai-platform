import request from './request'
import { resolveAgentStreamEndpoint } from './agentEndpoint'
import { useAuthStore } from '../store/authStore'

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
}

export interface ChatStreamMessageDTO {
  role: 'system' | 'user' | 'assistant'
  content: string
  attachments?: number[]
}

export interface ChatSendResponseDTO {
  id: number
  role: 'assistant'
  content: string
  sources?: Array<{ id: number; docName: string; snippet: string }>
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface StreamPayload {
  messages: ChatStreamMessageDTO[]
  sessionId: number
  attachments?: number[]
}

export interface StreamSourceItem {
  id: number
  docName: string
  snippet: string
  score?: number
}

interface StreamHandlers {
  onStart?: () => void
  onDelta?: (text: string) => void
  onSources?: (items: StreamSourceItem[], status?: string, message?: string) => void
  onEnd?: () => void
  onError?: (message: string) => void
  onRiskAlert?: (data: { code: number; message: string; category: string }) => void
}

const FIRST_PACKET_TIMEOUT_MS = 30_000
const IDLE_TIMEOUT_MS = 60_000

function getAuthToken(): string {
  const token = useAuthStore.getState().token
  if (!token) {
    throw new Error('auth token missing')
  }
  return token
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

  updateSessionKb: (sessionId: number, kbId: number) =>
    request.patch<unknown, ApiResponse<ChatSessionDTO>>(`/chat/sessions/${sessionId}/kb`, { kbId }),

  listMessages: (sessionId: number) =>
    request.get<unknown, ApiResponse<ChatMessageDTO[]>>(`/chat/sessions/${sessionId}/messages`),

  sendMessage: (sessionId: number, content: string) =>
    request.post<unknown, ApiResponse<ChatSendResponseDTO>>(`/chat/sessions/${sessionId}/messages`, {
      content,
    }),

  streamChat: async (payload: StreamPayload, handlers: StreamHandlers): Promise<void> => {
    const controller = new AbortController()
    let timeoutType: 'first_packet' | 'idle' | null = null
    let firstPacketTimer: ReturnType<typeof setTimeout> | null = null
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    const clearFirstPacketTimer = () => {
      if (firstPacketTimer) {
        clearTimeout(firstPacketTimer)
        firstPacketTimer = null
      }
    }

    const clearIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer)
        idleTimer = null
      }
    }

    const startFirstPacketTimer = () => {
      clearFirstPacketTimer()
      firstPacketTimer = setTimeout(() => {
        timeoutType = 'first_packet'
        controller.abort()
      }, FIRST_PACKET_TIMEOUT_MS)
    }

    const resetIdleTimer = () => {
      clearIdleTimer()
      idleTimer = setTimeout(() => {
        timeoutType = 'idle'
        controller.abort()
      }, IDLE_TIMEOUT_MS)
    }

    startFirstPacketTimer()

    try {
      const endpoint = resolveAgentStreamEndpoint(getAuthToken())
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: endpoint.headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`stream failed: http ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let sawAnyEvent = false
      let sawDone = false
      let sawError = false
      let latestError = ''
      let doneReason = ''
      let streamClosed = false

      while (!streamClosed) {
        const { done, value } = await reader.read()
        if (done) {
          streamClosed = true
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
            if (!sawAnyEvent) {
              sawAnyEvent = true
              clearFirstPacketTimer()
            }
            resetIdleTimer()

            let data: { text?: string; message?: string; status?: string; items?: StreamSourceItem[] } = {}
            try {
              data = JSON.parse(parsed.data) as {
                text?: string
                message?: string
                status?: string
                items?: StreamSourceItem[]
              }
            } catch {
              data = { message: parsed.data }
            }

            if (parsed.event === 'start') {
              handlers.onStart?.()
            } else if (parsed.event === 'delta' && data.text) {
              handlers.onDelta?.(data.text)
            } else if (parsed.event === 'sources') {
              handlers.onSources?.(data.items ?? [], data.status, data.message)
            } else if (parsed.event === 'risk_alert') {
              handlers.onRiskAlert?.(data as { code: number; message: string; category: string })
            } else if (parsed.event === 'error') {
              sawError = true
              latestError = data.message ?? 'stream error'
              handlers.onError?.(latestError)
            } else if (parsed.event === 'done' || parsed.event === 'end') {
              sawDone = true
              doneReason = data.message ?? parsed.event
              handlers.onEnd?.()
              await reader.cancel()
              return
            }
          }

          splitIndex = buffer.indexOf('\n\n')
        }
      }

      if (sawDone) {
        return
      }

      if (sawError) {
        throw new Error(latestError || 'stream_error_without_done')
      }

      throw new Error(doneReason ? `stream_closed_without_done:${doneReason}` : 'stream_closed_without_done')
    } catch (error) {
      if (timeoutType === 'first_packet') {
        throw new Error('stream timeout: first packet > 30s')
      }
      if (timeoutType === 'idle') {
        throw new Error('stream timeout: idle > 60s')
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('stream aborted')
      }
      throw error
    } finally {
      clearFirstPacketTimer()
      clearIdleTimer()
    }
  },
}
