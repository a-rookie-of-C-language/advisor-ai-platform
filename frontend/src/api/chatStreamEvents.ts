import type {
  StreamEventData,
  StreamHandlers,
  StreamRiskAlert,
  StreamToolResult,
} from './chatStreamTypes'

export function parseSseBlock(block: string): { event: string; data: string } | null {
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

export function parseStreamData(rawData: string): StreamEventData {
  try {
    const decoded = JSON.parse(rawData) as StreamEventData & { payload?: StreamEventData }
    return decoded.payload ?? decoded
  } catch {
    return { message: rawData }
  }
}

export function dispatchStreamEvent(
  event: string,
  data: StreamEventData,
  handlers: StreamHandlers,
  cancelReader: () => void,
): boolean {
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
      handlers.onRiskAlert?.(toRiskAlert(payload))
    },
    sys_error: (payload) => {
      handlers.onError?.(payload.message ?? 'stream error')
    },
    sys_done: (payload) => {
      if (!payload.text) {
        handlers.onEnd?.()
      }
      cancelReader()
    },
  }

  if (event === 'reasoning_delta' && data.text) {
    handlers.onReasoningDelta?.(data.text)
    return false
  }
  if (event === 'llm_delta' || event === 'llm_data') {
    if (data.text) {
      handlers.onDelta?.(data.text)
    }
    return false
  }
  if (eventHandlers[event]) {
    eventHandlers[event]?.(data)
    return event === 'sys_done'
  }
  if (event.startsWith('sys_')) {
    handlers.onSystemEvent?.({ event, payload: data })
  } else {
    handlers.onUnknownEvent?.(event, data)
  }
  return false
}

function toRiskAlert(payload: StreamEventData): StreamRiskAlert {
  return {
    code: toNumber(payload.code),
    message: payload.message ?? 'risk alert',
    category: toStringValue(payload.category, 'unknown'),
  }
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}
