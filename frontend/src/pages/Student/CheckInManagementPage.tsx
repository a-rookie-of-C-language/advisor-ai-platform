import { useEffect, useState } from 'react'
import { Button, Card, Col, Row, Space, Statistic, Table, Tag } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, SearchOutlined } from '@ant-design/icons'
import { checkInApi, type AvailableCheckInActivityVO, type CheckInRecordVO } from '../../api/checkInApi'
import { globalMessage } from '../../utils/globalMessage'

export default function CheckInManagementPage() {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<CheckInRecordVO[]>([])
  const [activities, setActivities] = useState<AvailableCheckInActivityVO[]>([])
  const [total, setTotal] = useState(0)

  const loadData = async () => {
    setLoading(true)
    try {
      const [recordResponse, activityResponse] = await Promise.all([
        checkInApi.listRecords({ page: 1, pageSize: 10 }),
        checkInApi.listAvailableActivities(),
      ])
      if (recordResponse.code === 200) {
        setRecords(recordResponse.data.records || [])
        setTotal(recordResponse.data.total || 0)
      }
      if (activityResponse.code === 200) {
        setActivities(activityResponse.data || [])
      }
    } catch {
      globalMessage.error('加载打卡数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleCheckIn = async (checkInId: string) => {
    try {
      const response = await checkInApi.checkIn(checkInId)
      if (response.code === 200) {
        globalMessage.success(response.data || '打卡成功')
        void loadData()
      }
    } catch {
      globalMessage.error('打卡失败')
    }
  }

  const recordColumns = [
    { title: '打卡ID', dataIndex: 'checkInId', key: 'checkInId', width: 220 },
    { title: '活动', dataIndex: 'activityTitle', key: 'activityTitle', width: 180 },
    { title: '班级', dataIndex: 'classCode', key: 'classCode', width: 120 },
    { title: '日期', dataIndex: 'checkDate', key: 'checkDate', width: 140 },
    {
      title: '状态',
      dataIndex: 'checkedIn',
      key: 'checkedIn',
      width: 100,
      render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? '已打卡' : '未打卡'}</Tag>,
    },
    { title: '打卡时间', dataIndex: 'checkTime', key: 'checkTime', width: 180 },
  ]

  const activityColumns = [
    { title: '课程', dataIndex: 'courseName', key: 'courseName', width: 160 },
    { title: '活动', dataIndex: 'title', key: 'title', width: 180 },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime', width: 180 },
    { title: '结束时间', dataIndex: 'endTime', key: 'endTime', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: AvailableCheckInActivityVO) => (
        <Button
          type="primary"
          size="small"
          icon={<CheckCircleOutlined />}
          disabled={record.checkedIn}
          onClick={() => handleCheckIn(record.checkInId)}
        >
          {record.checkedIn ? '已打卡' : '打卡'}
        </Button>
      ),
    },
  ]

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
          columns={recordColumns}
          dataSource={records}
          rowKey={(record) => `${record.checkInId || 'legacy'}-${record.studentId}-${record.checkDate}`}
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  )
}
