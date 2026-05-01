import request from './request'

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

export const monitorApi = {
  realtime: (params?: { minutes?: number; stepSeconds?: number }) =>
    request.get<unknown, MonitorRealtimeResponseDTO>('/monitor/realtime', { params }),
}
