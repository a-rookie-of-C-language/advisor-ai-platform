import { Card, Col, Row, Statistic, Table, DatePicker, Space } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { checkInApi, type AttendanceStatistics, type ClassAttendanceStatistics } from '../../api/checkInApi'
import { globalMessage } from '../../utils/globalMessage'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

export default function AttendanceOverviewPage() {
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<AttendanceStatistics | null>(null)
  const [classStatistics, setClassStatistics] = useState<ClassAttendanceStatistics[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('week'),
    dayjs().endOf('week'),
  ])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {
        begin: dateRange[0].format('YYYY-MM-DD'),
        end: dateRange[1].format('YYYY-MM-DD'),
      }

      const [statsResponse, classResponse] = await Promise.all([
        checkInApi.getAttendanceStatistics(params),
        checkInApi.getClassAttendanceStatistics(params),
      ])

      if (statsResponse.code === 200) {
        setStatistics(statsResponse.data)
      }

      if (classResponse.code === 200) {
        setClassStatistics(classResponse.data || [])
      }
    } catch {
      globalMessage.error('加载考勤数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [dateRange])

  const classColumns = [
    {
      title: '班级',
      dataIndex: 'className',
      key: 'className',
    },
    {
      title: '总记录',
      dataIndex: 'totalRecords',
      key: 'totalRecords',
    },
    {
      title: '正常',
      dataIndex: 'normalCount',
      key: 'normalCount',
      render: (value: number) => <span style={{ color: '#52c41a' }}>{value}</span>,
    },
    {
      title: '迟到',
      dataIndex: 'lateCount',
      key: 'lateCount',
      render: (value: number) => <span style={{ color: '#faad14' }}>{value}</span>,
    },
    {
      title: '缺勤',
      dataIndex: 'absentCount',
      key: 'absentCount',
      render: (value: number) => <span style={{ color: '#ff4d4f' }}>{value}</span>,
    },
    {
      title: '出勤率',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      render: (value: number) => `${value}%`,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([dates[0], dates[1]])
            }
          }}
        />
      </Space>

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

      <Card title="班级考勤统计" loading={loading}>
        <Table
          columns={classColumns}
          dataSource={classStatistics}
          rowKey="classCode"
          pagination={false}
        />
      </Card>
    </div>
  )
}
