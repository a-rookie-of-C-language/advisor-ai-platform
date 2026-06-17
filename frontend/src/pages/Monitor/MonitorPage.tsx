import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  createMonitorSseStream,
  type MonitorRealtimeResponseDTO,
  type MonitorStreamSubscription,
} from '../../api/monitorApi'
import { useAuthStore } from '../../store/authStore'
import {
  MonitorAlerts,
  MonitorHeader,
  MonitorMetricCards,
  MonitorSeriesCharts,
} from './MonitorPanels'
import { useTimerRegistry } from '../../utils/useTimerRegistry'
import styles from './MonitorPage.module.css'

const RECONNECT_DELAY_MS = 3000

export default function MonitorPage() {
  const [data, setData] = useState<MonitorRealtimeResponseDTO | null>(null)
  const [connected, setConnected] = useState(false)
  const [latestError, setLatestError] = useState<string | null>(null)
  const streamRef = useRef<MonitorStreamSubscription | null>(null)
  const closingRef = useRef(false)
  const timers = useTimerRegistry()
  const token = useAuthStore((s) => s.token)

  const connect = useCallback(() => {
    if (!token) {
      setConnected(false)
      setLatestError('未登录，无法连接监控')
      return
    }
    timers.clearAll()
    closingRef.current = false
    if (streamRef.current) {
      streamRef.current.abort()
      streamRef.current = null
    }
    streamRef.current = createMonitorSseStream(
      token,
      (monitorData) => {
        setData(monitorData)
        setConnected(true)
        setLatestError(null)
      },
      () => {
        setConnected(true)
        setLatestError(null)
      },
      (message) => {
        setConnected(false)
        setLatestError(message || '监控流连接异常')
        if (!closingRef.current) {
          timers.setTimeout(connect, RECONNECT_DELAY_MS)
        }
      },
    )
  }, [timers, token])

  useEffect(() => {
    connect()
    return () => {
      closingRef.current = true
      timers.clearAll()
      if (streamRef.current) {
        streamRef.current.abort()
        streamRef.current = null
      }
    }
  }, [connect, timers])

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
