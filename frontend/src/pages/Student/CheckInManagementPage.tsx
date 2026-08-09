import { Card, Col, Row, Space, Statistic, Table } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, SearchOutlined } from '@ant-design/icons'
import { checkInRecordColumns, createActivityColumns } from './checkInManagementColumns'
import { useCheckInManagement } from './useCheckInManagement'

export default function CheckInManagementPage() {
  const {
    loading,
    records,
    activities,
    total,
    handleCheckIn,
  } = useCheckInManagement()
  const activityColumns = createActivityColumns(handleCheckIn)

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic title="历史记录" value={total} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="可打卡活动" value={activities.length} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card title="当前可打卡" style={{ marginBottom: 16 }}>
        <Table
          columns={activityColumns}
          dataSource={activities}
          rowKey={(record) => record.checkInId}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Card title="打卡记录" extra={<Space><SearchOutlined /> 历史记录</Space>}>
        <Table
          columns={checkInRecordColumns}
          dataSource={records}
          rowKey={(record) => `${record.checkInId || 'legacy'}-${record.studentId}-${record.checkDate}`}
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  )
}
