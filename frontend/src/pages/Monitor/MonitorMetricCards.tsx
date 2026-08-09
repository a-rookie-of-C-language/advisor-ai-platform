import { Card, Col, Row, Space, Typography } from 'antd'
import type { MonitorRealtimeResponseDTO } from '../../api/monitorApi'
import styles from './MonitorPage.module.css'
import { statusClass, statusTag } from './monitorStatusView'

const { Text } = Typography

interface MonitorMetricCardsProps {
  data: MonitorRealtimeResponseDTO | null
}

export function MonitorMetricCards({ data }: MonitorMetricCardsProps) {
  return (
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
  )
}
