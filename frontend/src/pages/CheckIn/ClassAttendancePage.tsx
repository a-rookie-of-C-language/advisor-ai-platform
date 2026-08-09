import { Button, Card, Input, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import {
  attendanceApi,
  type ClassSessionVO,
  type SessionAttendanceVO,
} from '../../api/attendanceApi'
import { globalMessage } from '../../utils/globalMessage'

const statusOptions = [
  { value: 'PRESENT', label: '出勤' },
  { value: 'LATE', label: '迟到' },
  { value: 'LEAVE', label: '请假' },
  { value: 'ABSENT', label: '旷课' },
]

const statusColor: Record<string, string> = {
  PRESENT: 'green',
  LATE: 'orange',
  LEAVE: 'blue',
  ABSENT: 'red',
}

export default function ClassAttendancePage() {
  const [loading, setLoading] = useState(false)
  const [term, setTerm] = useState('')
  const [sessions, setSessions] = useState<ClassSessionVO[]>([])
  const [selectedSession, setSelectedSession] = useState<ClassSessionVO | null>(null)
  const [records, setRecords] = useState<SessionAttendanceVO[]>([])

  const loadSessions = async () => {
    setLoading(true)
    try {
      const response = await attendanceApi.listSessions({ term: term || undefined })
      if (response.code === 200) {
        setSessions(response.data || [])
      }
    } catch {
      globalMessage.error('加载课堂列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadAttendance = async (session: ClassSessionVO) => {
    setSelectedSession(session)
    setLoading(true)
    try {
      const response = await attendanceApi.getSessionAttendance(session.id)
      if (response.code === 200) {
        setRecords(response.data || [])
      }
    } catch {
      globalMessage.error('加载考勤名单失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSessions()
  }, [])

  const saveAttendance = async () => {
    if (!selectedSession) {
      return
    }
    try {
      const marks = records
        .filter((record) => record.status !== 'PRESENT' || record.remark)
        .map((record) => ({
          studentId: record.studentId,
          status: record.status,
          remark: record.remark,
        }))
      const response = await attendanceApi.updateSessionAttendance(selectedSession.id, marks)
      if (response.code === 200) {
        setRecords(response.data || [])
        globalMessage.success('考勤已保存')
      }
    } catch {
      globalMessage.error('保存考勤失败')
    }
  }

  const sessionColumns: ColumnsType<ClassSessionVO> = [
    { title: '周次', dataIndex: 'weekNo', width: 80 },
    { title: '班级', dataIndex: 'classCode', width: 120 },
    { title: '课程', dataIndex: 'courseName', width: 160 },
    {
      title: '节次',
      width: 120,
      render: (_, record) => `${record.weekday} / ${record.periodStart}-${record.periodEnd}`,
    },
    { title: '地点', dataIndex: 'location', width: 140 },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Button size="small" onClick={() => void loadAttendance(record)}>
          登记
        </Button>
      ),
    },
  ]

  const attendanceColumns = useMemo<ColumnsType<SessionAttendanceVO>>(
    () => [
      { title: '学号', dataIndex: 'studentNo', width: 120 },
      { title: '姓名', dataIndex: 'studentName', width: 100 },
      {
        title: '状态',
        dataIndex: 'status',
        width: 150,
        render: (value: string, record) => (
          <Select
            value={value}
            options={statusOptions}
            style={{ width: 120 }}
            onChange={(nextStatus) => {
              setRecords((items) =>
                items.map((item) =>
                  item.studentId === record.studentId ? { ...item, status: nextStatus } : item,
                ),
              )
            }}
          />
        ),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        render: (value: string | undefined, record) => (
          <Input
            value={value}
            onChange={(event) => {
              const remark = event.target.value
              setRecords((items) =>
                items.map((item) =>
                  item.studentId === record.studentId ? { ...item, remark } : item,
                ),
              )
            }}
          />
        ),
      },
    ],
    [],
  )

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="课堂列表"
        extra={
          <Space>
            <Input
              placeholder="学期"
              value={term}
              style={{ width: 160 }}
              onChange={(event) => setTerm(event.target.value)}
            />
            <Button onClick={() => void loadSessions()}>查询</Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={sessionColumns}
          dataSource={sessions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Card
        title={
          selectedSession
            ? `${selectedSession.courseName} ${selectedSession.classCode} 第${selectedSession.weekNo}周`
            : '考勤名单'
        }
        extra={
          <Space>
            {selectedSession ? <Tag color={statusColor[selectedSession.status]}>{selectedSession.status}</Tag> : null}
            <Button type="primary" disabled={!selectedSession} onClick={() => void saveAttendance()}>
              保存
            </Button>
          </Space>
        }
      >
        <Table
          columns={attendanceColumns}
          dataSource={records}
          rowKey="studentId"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  )
}
