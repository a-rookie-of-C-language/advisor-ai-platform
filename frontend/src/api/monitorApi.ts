import { parseSseBlock } from './chatStreamEvents'

export interface MonitorPointDTO {
  ts: number
  value: number
}

export interface MonitorSeriesDTO {
  key: string
  name: string
  points: MonitorPointDTO[]
  unit: string
}

export interface MonitorMetricCardDTO {
  key: string
  name: string
  value: number
  unit: string
  status: 'ok' | 'warn' | 'critical' | string
}

export interface MonitorRealtimeResponseDTO {
  generatedAt: number
  refreshSeconds: number
  cards: MonitorMetricCardDTO[]
  series: MonitorSeriesDTO[]
  alerts: string[]
}

export interface MonitorStreamSubscription {
  abort: () => void
}

export function createMonitorSseStream(
  token: string,
  onData: (data: MonitorRealtimeResponseDTO) => void,
  onOpen?: () => void,
  onError?: (message: string) => void,
): MonitorStreamSubscription {
  const controller = new AbortController()

  void readMonitorStream(controller.signal, token, onData, onOpen, onError)

  return {
    abort: () => controller.abort(),
  }
}

async function readMonitorStream(
  signal: AbortSignal,
  token: string,
  onData: (data: MonitorRealtimeResponseDTO) => void,
  onOpen?: () => void,
  onError?: (message: string) => void,
) {
  try {
    const response = await fetch('/api/monitor/stream', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal,
    })

    if (!response.ok || !response.body) {
      throw new Error(`监控流连接失败: ${response.status}`)
    }

    onOpen?.()
    await consumeMonitorStream(response.body, onData)
  } catch (error) {
    if (signal.aborted) {
      return
    }
    onError?.(error instanceof Error ? error.message : '监控流连接异常')
  }
}

async function consumeMonitorStream(
  body: ReadableStream<Uint8Array>,
  onData: (data: MonitorRealtimeResponseDTO) => void,
) {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '')

    let splitIndex = buffer.indexOf('\n\n')
    while (splitIndex >= 0) {
      const rawBlock = buffer.slice(0, splitIndex)
      buffer = buffer.slice(splitIndex + 2)
      handleMonitorBlock(rawBlock, onData)
      splitIndex = buffer.indexOf('\n\n')
    }
  }
}

function handleMonitorBlock(
  rawBlock: string,
  onData: (data: MonitorRealtimeResponseDTO) => void,
) {
  const parsed = parseSseBlock(rawBlock)
  if (!parsed) {
    return
  }
  if (parsed.event === 'error') {
    throw new Error(parsed.data)
  }
  if (parsed.event !== 'monitor' && parsed.event !== 'message') {
    return
  }
  try {
    const data = JSON.parse(parsed.data) as MonitorRealtimeResponseDTO
    onData(data)
  } catch {
    // ignore malformed messages
  }
}

export function createMonitorWebSocket(
  token: string,
  onData: (data: MonitorRealtimeResponseDTO) => void,
  onError?: (err: Event) => void,
): WebSocket {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsHost = import.meta.env.VITE_WS_HOST ?? window.location.hostname + ':8082'
  const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/monitor?token=${encodeURIComponent(token)}`)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as MonitorRealtimeResponseDTO
      onData(data)
    } catch {
      // ignore malformed messages
    }
  }

  ws.onerror = (event) => {
    onError?.(event)
  }

  return ws
}
