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
