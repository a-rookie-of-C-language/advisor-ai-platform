import { Card, Col, Empty, Row } from 'antd'
import type { MonitorRealtimeResponseDTO } from '../../api/monitorApi'
import { toMonitorPolyline } from './monitorChartModel'
import styles from './MonitorPage.module.css'

interface MonitorSeriesChartsProps {
  data: MonitorRealtimeResponseDTO | null
}

export function MonitorSeriesCharts({ data }: MonitorSeriesChartsProps) {
  return (
    <Row gutter={[12, 12]} style={{ marginTop: 4 }}>
      {(data?.series ?? []).map((series) => (
        <Col key={series.key} xs={24} lg={12}>
          <Card
            className={styles.chartCard}
            title={`${series.name} (${series.unit})`}
            loading={!data}
          >
            <div className={styles.chartWrap}>
              {series.points.length === 0 ? (
                <div className={styles.chartEmpty}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据点" />
                </div>
              ) : (
                <svg viewBox="0 0 600 160" width="100%" height="100%" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    points={toMonitorPolyline(series.points, 600, 160)}
                  />
                </svg>
              )}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}
