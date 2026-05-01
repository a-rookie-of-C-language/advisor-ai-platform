import { useEffect, useMemo, useState } from 'react'
import { Alert, App, Card, Col, Empty, Row, Space, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { monitorApi, type MonitorRealtimeResponseDTO, type MonitorSeriesDTO } from '../../api/monitorApi'
import styles from './MonitorPage.module.css'

const { Title, Text } = Typography

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
  const { message } = App.useApp()
  const [data, setData] = useState<MonitorRealtimeResponseDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [latestError, setLatestError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await monitorApi.realtime({ minutes: 15, stepSeconds: 10 })
      setData(res)
      setLatestError(null)
    } catch (e) {
      setLatestError(typeof e === 'string' ? e : '监控数据加载失败')
      message.error(typeof e === 'string' ? e : '监控数据加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!data?.refreshSeconds) {
      return
    }
    const timer = setInterval(() => {
      void load()
    }, data.refreshSeconds * 1000)
    return () => clearInterval(timer)
  }, [data?.refreshSeconds])

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
            最近刷新：{generatedAtText} · 自动刷新间隔：{data?.refreshSeconds ?? 10}s
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
            <Card loading={loading}>
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
            <Card className={styles.chartCard} title={`${s.name} (${s.unit})`} loading={loading}>
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
