import { Card, Col, Row, Statistic } from 'antd'
import { ClockCircleOutlined, RiseOutlined } from '@ant-design/icons'
import type { StudentCheckInSummaryResponse } from '../../api/studentApi'

interface StudentCheckInSummaryCardsProps {
  loading: boolean
  summary: StudentCheckInSummaryResponse | null
}

export default function StudentCheckInSummaryCards({
  loading,
  summary,
}: StudentCheckInSummaryCardsProps) {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={8}>
        <Card loading={loading}>
          <Statistic
            title="累计打卡"
            value={summary?.totalCount ?? 0}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card loading={loading}>
          <Statistic
            title="已打卡次数"
            value={summary?.checkedInCount ?? 0}
            prefix={<RiseOutlined />}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card loading={loading}>
          <Statistic title="打卡率" value={summary ? `${summary.checkInRate ?? 0}%` : '0%'} />
        </Card>
      </Col>
    </Row>
  )
}
