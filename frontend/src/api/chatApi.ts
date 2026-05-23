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
  sources?: StreamSourceItem[]
  events?: StreamEventRecord[]
}

export interface ChatStreamMessageDTO {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatSendResponseDTO {
  id: number
  role: 'assistant'
  content: string
  sources?: Array<{ id: number; docName: string; snippet: string }>
  events?: StreamEventRecord[]
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface StreamPayload {
  messages: ChatStreamMessageDTO[]
  sessionId: number
}

export interface StreamSourceItem {
  id: number
  docName: string
  snippet: string
  score?: number
}

export interface StreamToolResult {
  status?: string
  message?: string
  items?: unknown[]
  output?: unknown
  derived?: {
    sources?: StreamSourceItem[]
  }
}

export interface StreamEventData extends Record<string, unknown> {
  text?: string
  message?: string
  goal?: string
  summary?: string
  stop_when?: string
  status?: string
  items?: StreamSourceItem[]
  elapsed_sec?: number
  finish_reason?: string
  tool_name?: string
  tool_call_id?: string
  input?: unknown
  output?: unknown
  code?: string
  stage?: string
  agent_name?: string
  matched_by?: string
  categories?: string[]
  reason?: string
  source?: string
  required_tools?: string[]
  mode?: string
  sufficient?: boolean
  steps?: Array<{
    action?: string
    tool_name?: string
    arguments?: unknown
    reason?: string
    expected_outcome?: string
    sufficient?: boolean
    summary?: string
  }>
  derived?: {
    sources?: StreamSourceItem[]
  }
}

export interface StreamEventRecord {
  event: string
  source?: string
  traceId?: string
  timestamp?: number
  payload?: StreamEventData
}

interface StreamHandlers {
  onStart?: () => void
  onEvent?: (data: { event: string; payload: StreamEventData }) => void
  onProgress?: (message: string, elapsedSec?: number) => void
  onReasoningDelta?: (text: string) => void
  onDelta?: (text: string) => void
  onSystemEvent?: (data: { event: string; payload: StreamEventData }) => void
  onSources?: (items: StreamSourceItem[], status?: string, message?: string) => void
  onToolUse?: (data: { toolName: string; toolCallId: string; input: unknown }) => void
  onToolResult?: (data: { toolName: string; toolCallId: string; result: StreamToolResult }) => void
  onToolError?: (data: { toolName: string; toolCallId: string; message: string; code?: string }) => void
  onEnd?: () => void
  onError?: (message: string) => void
  onRiskAlert?: (data: { code: number; message: string; category: string }) => void
  onUnknownEvent?: (event: string, data: unknown) => void
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

function parseStreamData(rawData: string): StreamEventData {
  try {
    const decoded = JSON.parse(rawData) as StreamEventData & { payload?: StreamEventData }
    return decoded.payload ?? decoded
  } catch {
    return { message: rawData }
  }
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
      let sawDelta = false
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

            const data = parseStreamData(parsed.data)
            handlers.onEvent?.({ event: parsed.event, payload: data })

            const eventHandlers: Partial<Record<string, (payload: StreamEventData) => void>> = {
              sys_start: () => {
                handlers.onStart?.()
              },
              sys_progress: (payload) => {
                const elapsedSec = typeof payload.elapsed_sec === 'number' ? payload.elapsed_sec : undefined
                handlers.onProgress?.(payload.message ?? '模型思考中，请稍候...', elapsedSec)
              },
              tool_use: (payload) => {
                handlers.onToolUse?.({
                  toolName: payload.tool_name ?? '',
                  toolCallId: payload.tool_call_id ?? '',
                  input: payload.input,
                })
              },
              tool_result: (payload) => {
                const result: StreamToolResult = {
                  status: payload.status,
                  message: payload.message,
                  items: payload.items,
                  output: payload.output,
                  derived: payload.derived,
                }
                handlers.onToolResult?.({
                  toolName: payload.tool_name ?? '',
                  toolCallId: payload.tool_call_id ?? '',
                  result,
                })
                if (payload.derived?.sources?.length) {
                  handlers.onSources?.(payload.derived.sources, payload.status, payload.message)
                }
              },
              tool_error: (payload) => {
                handlers.onToolError?.({
                  toolName: payload.tool_name ?? '',
                  toolCallId: payload.tool_call_id ?? '',
                  message: payload.message ?? 'tool error',
                  code: payload.code,
                })
                handlers.onError?.(payload.message ?? 'tool error')
              },
              risk_alert: (payload) => {
                handlers.onRiskAlert?.(payload as unknown as { code: number; message: string; category: string })
              },
              sys_error: (payload) => {
                sawError = true
                latestError = payload.message ?? 'stream error'
                handlers.onError?.(latestError)
              },
              sys_done: (payload) => {
                sawDone = true
                doneReason = payload.finish_reason ?? parsed.event
                if (!sawDelta) {
                  sawError = true
                  latestError = 'stream done without delta'
                  handlers.onError?.(latestError)
                  throw new Error(latestError)
                }
                handlers.onEnd?.()
                void reader.cancel()
              },
            }

            if (parsed.event === 'reasoning_delta' && data.text) {
              handlers.onReasoningDelta?.(data.text)
            } else if (parsed.event === 'llm_delta' || parsed.event === 'llm_data') {
              if (data.text) {
                sawDelta = true
                handlers.onDelta?.(data.text)
              }
            } else if (eventHandlers[parsed.event]) {
              eventHandlers[parsed.event]?.(data)
              if (parsed.event === 'sys_done') {
                return
              }
            } else if (parsed.event.startsWith('sys_')) {
              handlers.onSystemEvent?.({ event: parsed.event, payload: data })
            } else {
              handlers.onUnknownEvent?.(parsed.event, data)
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
