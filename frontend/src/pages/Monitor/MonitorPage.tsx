import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { createMonitorWebSocket, type MonitorRealtimeResponseDTO } from '../../api/monitorApi'
import { useAuthStore } from '../../store/authStore'
import {
  MonitorAlerts,
  MonitorHeader,
  MonitorMetricCards,
  MonitorSeriesCharts,
} from './MonitorPanels'
import styles from './MonitorPage.module.css'

const RECONNECT_DELAY_MS = 3000

export default function MonitorPage() {
  const [data, setData] = useState<MonitorRealtimeResponseDTO | null>(null)
  const [connected, setConnected] = useState(false)
  const [latestError, setLatestError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const token = useAuthStore((s) => s.token)

  const connect = useCallback(() => {
    if (!token) {
      setLatestError('未登录，无法连接监控')
      return
    }
    const ws = createMonitorWebSocket(
      token,
      (monitorData) => {
        setData(monitorData)
        setConnected(true)
        setLatestError(null)
      },
      () => {
        setConnected(false)
        setLatestError('WebSocket 连接异常')
      },
    )

    ws.onopen = () => {
      setConnected(true)
      setLatestError(null)
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }

    wsRef.current = ws
  }, [token])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  const generatedAtText = useMemo(() => {
    if (!data) return '-'
    return dayjs(data.generatedAt).format('YYYY-MM-DD HH:mm:ss')
  }, [data])

  return (
    <div className={styles.page}>
      <MonitorHeader
        connected={connected}
        generatedAtText={generatedAtText}
        refreshSeconds={data?.refreshSeconds}
      />
      <MonitorAlerts latestError={latestError} alerts={data?.alerts} />
      <MonitorMetricCards data={data} />
      <MonitorSeriesCharts data={data} />
    </div>
  )
}
