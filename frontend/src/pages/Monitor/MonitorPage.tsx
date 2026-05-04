import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Card, Col, Empty, Row, Space, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { createMonitorWebSocket, type MonitorRealtimeResponseDTO, type MonitorSeriesDTO } from '../../api/monitorApi'
import { useAuthStore } from '../../store/authStore'
import styles from './MonitorPage.module.css'

const { Title, Text } = Typography
const RECONNECT_DELAY_MS = 3000

function statusClass(status: string) {
  if (status === 'critical') return styles.critical
  if (status === 'warn') return styles.warn
  return styles.ok
}

function statusTag(status: string) {
  if (status === 'critical') return <Tag color="red">严重</Tag>
  if (status === 'warn') return <Tag color="gold">告警</Tag>
  return <Tag color="green">正常</Tag>
}

function toPolyline(points: MonitorSeriesDTO['points'], width: number, height: number) {
  if (points.length === 0) return ''
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-6)
  return points
    .map((p, idx) => {
      const x = (idx / Math.max(points.length - 1, 1)) * width
      const y = height - ((p.value - min) / span) * height
      return `${x},${y}`
    })
    .join(' ')
}

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
      <div className={styles.header}>
        <div>
          <Title level={4} style={{ marginBottom: 2 }}>
            监控中心（实时）
          </Title>
          <div className={styles.meta}>
            {connected ? (
              <Tag color="green">已连接</Tag>
            ) : (
              <Tag color="red">未连接</Tag>
            )}
            最近刷新：{generatedAtText} · 推送间隔：{data?.refreshSeconds ?? 10}s
          </div>
        </div>
      </div>

      {latestError && (
        <Alert style={{ marginBottom: 12 }} type="warning" message={latestError} showIcon />
      )}

      {data?.alerts && data.alerts.length > 0 && (
        <Alert
          style={{ marginBottom: 12 }}
          type="error"
          showIcon
          message="监控告警"
          description={
            <ul className={styles.alertList}>
              {data.alerts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          }
        />
      )}

      <Row gutter={[12, 12]}>
        {(data?.cards ?? []).map((card) => (
          <Col key={card.key} xs={24} sm={12} lg={8} xl={6}>
            <Card loading={!data}>
              <Space direction="vertical" size={4}>
                <Text type="secondary">{card.name}</Text>
                <div className={`${styles.cardValue} ${statusClass(card.status)}`}>
                  {card.value}
                  <span style={{ fontSize: 14, marginLeft: 6 }}>{card.unit}</span>
                </div>
                {statusTag(card.status)}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 4 }}>
        {(data?.series ?? []).map((s) => (
          <Col key={s.key} xs={24} lg={12}>
            <Card className={styles.chartCard} title={`${s.name} (${s.unit})`} loading={!data}>
              <div className={styles.chartWrap}>
                {s.points.length === 0 ? (
                  <div className={styles.chartEmpty}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据点" />
                  </div>
                ) : (
                  <svg viewBox="0 0 600 160" width="100%" height="100%" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      points={toPolyline(s.points, 600, 160)}
                    />
                  </svg>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
