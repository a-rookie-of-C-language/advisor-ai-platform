import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Button, Tag, Space } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, RiseOutlined, SearchOutlined } from '@ant-design/icons'
import { checkInApi, type CheckInRecordVO } from '../../api/checkInApi'
import { globalMessage } from '../../utils/globalMessage'

export default function CheckInManagementPage() {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<CheckInRecordVO[]>([])
  const [total, setTotal] = useState(0)

  const loadRecords = async () => {
    setLoading(true)
    try {
      const response = await checkInApi.listRecords({ page: 1, pageSize: 10 })
      if (response.code === 200) {
        setRecords(response.data.records || [])
        setTotal(response.data.total || 0)
      }
    } catch {
      globalMessage.error('加载打卡记录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  const handleCheckIn = async () => {
    try {
      const response = await checkInApi.checkIn()
      if (response.code === 200) {
        globalMessage.success('打卡成功')
        void loadRecords()
      }
    } catch {
      globalMessage.error('打卡失败')
    }
  }

  const columns = [
    { title: '学号', dataIndex: 'studentId', key: 'studentId', width: 120 },
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

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleCheckIn}>
          立即打卡
        </Button>
      </Space>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic title="累计记录" value={total} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="今日状态" value="待接入学生维度" prefix={<RiseOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="最近刷新" value={loading ? '加载中' : '已完成'} />
          </Card>
        </Col>
      </Row>

      <Card title="打卡记录" extra={<Space><SearchOutlined /> 查询学生打卡</Space>}>
        <Table
          columns={columns}
          dataSource={records}
          rowKey={(record) => `${record.studentId}-${record.checkDate}`}
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  )
}
