import { Card, Col, Row, Statistic } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import type { AttendanceStatistics } from '../../api/checkInApi'

type AttendanceSummaryCardsProps = {
  statistics: AttendanceStatistics | null
}

export default function AttendanceSummaryCards({ statistics }: AttendanceSummaryCardsProps) {
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总记录"
              value={statistics?.totalRecords || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正常"
              value={statistics?.normalCount || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="迟到"
              value={statistics?.lateCount || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="缺勤"
              value={statistics?.absentCount || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card>
            <Statistic
              title="出勤率"
              value={statistics?.attendanceRate || 0}
              suffix="%"
              precision={2}
              valueStyle={{
                color: (statistics?.attendanceRate || 0) >= 90 ? '#52c41a' : '#ff4d4f',
              }}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}
