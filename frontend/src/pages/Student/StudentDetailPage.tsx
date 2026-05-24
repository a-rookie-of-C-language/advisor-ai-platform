import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Row, Col, Statistic, Table, Tag, Button, Space } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, RiseOutlined } from '@ant-design/icons'
import {
  studentApi,
  type StudentDetailResponse,
  type StudentCheckInDetailResponse,
  type StudentCheckInSummaryResponse,
} from '../../api/studentApi'
import { globalMessage } from '../../utils/globalMessage'

export default function StudentDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const studentId = Number(params.id)
  const [loading, setLoading] = useState(false)
  const [student, setStudent] = useState<StudentDetailResponse | null>(null)
  const [summary, setSummary] = useState<StudentCheckInSummaryResponse | null>(null)
  const [detail, setDetail] = useState<StudentCheckInDetailResponse | null>(null)

  const loadData = async () => {
    if (Number.isNaN(studentId)) {
      globalMessage.error('学生ID不合法')
      navigate('/student', { replace: true })
      return
    }

    setLoading(true)
    try {
      const [studentResponse, summaryResponse, detailResponse] = await Promise.all([
        studentApi.getById(studentId),
        studentApi.getCheckInSummary(studentId),
        studentApi.getCheckInDetail(studentId, 10),
      ])

      if (studentResponse.code === 200) {
        setStudent(studentResponse.data)
      }
      if (summaryResponse.code === 200) {
        setSummary(summaryResponse.data)
      }
      if (detailResponse.code === 200) {
        setDetail(detailResponse.data)
      }
    } catch {
      globalMessage.error('加载学生详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [studentId])

  const columns = [
    {
      title: '日期',
      dataIndex: 'checkDate',
      key: 'checkDate',
      width: 140,
    },
    {
      title: '状态',
      dataIndex: 'checkedIn',
      key: 'checkedIn',
      width: 100,
      render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? '已打卡' : '未打卡'}</Tag>,
    },
    {
      title: '打卡时间',
      dataIndex: 'checkTime',
      key: 'checkTime',
      width: 180,
      render: (value?: string) => value || '-',
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/student')}>
          返回学生管理
        </Button>
        <Button icon={<CheckCircleOutlined />} onClick={() => navigate('/student/check-in')}>
          打卡管理
        </Button>
      </Space>

      <Card title="学生基本信息" loading={loading} style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="学号">{student?.studentNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="姓名">{student?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="性别">{student?.genderText || '-'}</Descriptions.Item>
          <Descriptions.Item label="年级">{student?.grade || '-'}</Descriptions.Item>
          <Descriptions.Item label="专业">{student?.major || '-'}</Descriptions.Item>
          <Descriptions.Item label="班级">{student?.classCode || '-'}</Descriptions.Item>
          <Descriptions.Item label="辅导员">{student?.counselorNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{student?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{student?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="宿舍">{student?.dormitory || '-'}</Descriptions.Item>
          <Descriptions.Item label="紧急联系人">{student?.emergencyContact || '-'}</Descriptions.Item>
          <Descriptions.Item label="信息完整度">{student?.infoCompletenessText || '-'}</Descriptions.Item>
          <Descriptions.Item label="风险等级">{student?.riskLevelText || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

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

      <Card title="最近打卡记录" loading={loading}>
        <Table
          columns={columns}
          dataSource={detail?.recentRecords || []}
          rowKey={(record) => `${record.checkDate}-${record.checkTime || 'none'}`}
          pagination={false}
        />
      </Card>
    </div>
  )
}
