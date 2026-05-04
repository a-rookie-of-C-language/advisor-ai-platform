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

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export const monitorApi = {
  realtime: async (params?: { minutes?: number; stepSeconds?: number }) => {
    const res = await request.get<unknown, ApiResponse<MonitorRealtimeResponseDTO>>(
      '/monitor/realtime',
      { params },
    )
    return res.data
  },
}
