import { Button, Card, DatePicker, Form, Input, Modal, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import {
  attendanceApi,
  type AttendanceWorkOrderVO,
  type ClassSessionVO,
} from '../../api/attendanceApi'
import { useAuthStore } from '../../store/authStore'
import { globalMessage } from '../../utils/globalMessage'

interface WorkOrderFormValues {
  sessionId: number
  reason: string
  targetSessionDate?: dayjs.Dayjs
  targetStartTime?: dayjs.Dayjs
  targetEndTime?: dayjs.Dayjs
  targetLocation?: string
}

const workOrderStatusColor: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
}

export default function AttendanceWorkOrderPage() {
  const role = useAuthStore((state) => state.role)
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<ClassSessionVO[]>([])
  const [workOrders, setWorkOrders] = useState<AttendanceWorkOrderVO[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<WorkOrderFormValues>()

  const loadData = async () => {
    setLoading(true)
    try {
      const [sessionResponse, workOrderResponse] = await Promise.all([
        attendanceApi.listSessions(),
        attendanceApi.listWorkOrders(),
      ])
      if (sessionResponse.code === 200) {
        setSessions(sessionResponse.data || [])
      }
      if (workOrderResponse.code === 200) {
        setWorkOrders(workOrderResponse.data || [])
      }
    } catch {
      globalMessage.error('加载工单数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const submitWorkOrder = async () => {
    const values = await form.validateFields()
    try {
      const response = await attendanceApi.createWorkOrder({
        sessionId: values.sessionId,
        reason: values.reason,
        targetSessionDate: values.targetSessionDate?.format('YYYY-MM-DD'),
        targetStartTime: values.targetStartTime?.format('YYYY-MM-DDTHH:mm:ss'),
        targetEndTime: values.targetEndTime?.format('YYYY-MM-DDTHH:mm:ss'),
        targetLocation: values.targetLocation,
      })
      if (response.code === 200) {
        globalMessage.success('工单已提交')
        setModalOpen(false)
        form.resetFields()
        await loadData()
      }
    } catch {
      globalMessage.error('提交工单失败')
    }
  }

  const review = async (workOrderId: number, status: string) => {
    try {
      const response = await attendanceApi.reviewWorkOrder(workOrderId, status)
      if (response.code === 200) {
        globalMessage.success('审批完成')
        await loadData()
      }
    } catch {
      globalMessage.error('审批失败')
    }
  }

  const columns: ColumnsType<AttendanceWorkOrderVO> = [
    { title: '班级', dataIndex: 'classCode', width: 120 },
    { title: '课堂ID', dataIndex: 'sessionId', width: 100 },
    { title: '原因', dataIndex: 'reason' },
    {
      title: '目标日期',
      dataIndex: 'targetSessionDate',
      width: 120,
    },
    { title: '目标地点', dataIndex: 'targetLocation', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => <Tag color={workOrderStatusColor[value]}>{value}</Tag>,
    },
    {
      title: '操作',
      width: 160,
      render: (_, record) =>
        role === 'ADMIN' || role === 'ADVISOR' ? (
          <Space>
            <Button
              size="small"
              disabled={record.status !== 'PENDING'}
              onClick={() => void review(record.id, 'APPROVED')}
            >
              同意
            </Button>
            <Button
              size="small"
              danger
              disabled={record.status !== 'PENDING'}
              onClick={() => void review(record.id, 'REJECTED')}
            >
              拒绝
            </Button>
          </Space>
        ) : null,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="考勤工单"
        extra={
          role === 'MONITOR' ? (
            <Button type="primary" onClick={() => setModalOpen(true)}>
              提交调课工单
            </Button>
          ) : null
        }
      >
        <Table
          columns={columns}
          dataSource={workOrders}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="提交调课工单"
        open={modalOpen}
        onOk={() => void submitWorkOrder()}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="sessionId" label="课堂" rules={[{ required: true }]}>
            <Select
              options={sessions.map((session) => ({
                value: session.id,
                label: `${session.courseName} 第${session.weekNo}周 ${session.classCode}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="reason" label="调课原因" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="targetSessionDate" label="调整日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="targetStartTime" label="开始时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="targetEndTime" label="结束时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="targetLocation" label="调整地点">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
