import { Card, Table, Tag, Button, Modal, Input, Select, Space, message } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { checkInApi, type CheckInException } from '../../api/checkInApi'
import { globalMessage } from '../../utils/globalMessage'

const { TextArea } = Input
const { Option } = Select

export default function ExceptionHandlingPage() {
  const [loading, setLoading] = useState(false)
  const [exceptions, setExceptions] = useState<CheckInException[]>([])
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [modalVisible, setModalVisible] = useState(false)
  const [currentException, setCurrentException] = useState<CheckInException | null>(null)
  const [handlerNote, setHandlerNote] = useState('')
  const [targetStatus, setTargetStatus] = useState('')

  const loadExceptions = async () => {
    setLoading(true)
    try {
      const response = await checkInApi.listExceptions({
        status: statusFilter,
      })
      if (response.code === 200) {
        setExceptions(response.data || [])
      }
    } catch {
      globalMessage.error('加载异常数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadExceptions()
  }, [statusFilter])

  const handleException = async () => {
    if (!currentException || !targetStatus) {
      message.warning('请选择处理状态')
      return
    }

    try {
      const response = await checkInApi.handleException(
        currentException.id,
        targetStatus,
        handlerNote
      )
      if (response.code === 200) {
        globalMessage.success('处理成功')
        setModalVisible(false)
        setHandlerNote('')
        setTargetStatus('')
        void loadExceptions()
      }
    } catch {
      globalMessage.error('处理失败')
    }
  }

  const openHandleModal = (exception: CheckInException) => {
    setCurrentException(exception)
    setTargetStatus(exception.status === 'PENDING' ? 'PROCESSING' : 'COMPLETED')
    setModalVisible(true)
  }

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'orange', text: '待处理' },
      PROCESSING: { color: 'blue', text: '处理中' },
      COMPLETED: { color: 'green', text: '已完成' },
      CLOSED: { color: 'default', text: '已关闭' },
    }
    const config = statusMap[status] || { color: 'default', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const getExceptionTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      LATE: { color: 'orange', text: '迟到' },
      ABSENT: { color: 'red', text: '缺勤' },
      LEAVE_EARLY: { color: 'orange', text: '早退' },
    }
    const config = typeMap[type] || { color: 'default', text: type }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const columns = [
    {
      title: '学生ID',
      dataIndex: 'studentId',
      key: 'studentId',
    },
    {
      title: '打卡活动',
      dataIndex: 'checkInId',
      key: 'checkInId',
    },
    {
      title: '异常类型',
      dataIndex: 'exceptionType',
      key: 'exceptionType',
      render: (type: string) => getExceptionTypeTag(type),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '处理人',
      dataIndex: 'handlerId',
      key: 'handlerId',
      render: (handlerId: number) => handlerId || '-',
    },
    {
      title: '处理备注',
      dataIndex: 'handlerNote',
      key: 'handlerNote',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: CheckInException) => (
        <Button
          type="primary"
          size="small"
          icon={<ExclamationCircleOutlined />}
          disabled={record.status === 'COMPLETED' || record.status === 'CLOSED'}
          onClick={() => openHandleModal(record)}
        >
          处理
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="异常处理"
        extra={
          <Space>
            <Select
              placeholder="筛选状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setStatusFilter(value)}
            >
              <Option value="PENDING">待处理</Option>
              <Option value="PROCESSING">处理中</Option>
              <Option value="COMPLETED">已完成</Option>
              <Option value="CLOSED">已关闭</Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={exceptions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="处理异常"
        open={modalVisible}
        onOk={handleException}
        onCancel={() => {
          setModalVisible(false)
          setHandlerNote('')
          setTargetStatus('')
        }}
        okText="确认处理"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>学生ID：</strong>
            {currentException?.studentId}
          </div>
          <div>
            <strong>异常类型：</strong>
            {currentException?.exceptionType && getExceptionTypeTag(currentException.exceptionType)}
          </div>
          <div>
            <strong>处理状态：</strong>
            <Select
              value={targetStatus}
              onChange={(value) => setTargetStatus(value)}
              style={{ width: '100%' }}
            >
              {currentException?.status === 'PENDING' && (
                <Option value="PROCESSING">处理中</Option>
              )}
              <Option value="COMPLETED">已完成</Option>
              <Option value="CLOSED">已关闭</Option>
            </Select>
          </div>
          <div>
            <strong>处理备注：</strong>
            <TextArea
              value={handlerNote}
              onChange={(e) => setHandlerNote(e.target.value)}
              placeholder="请输入处理备注"
              rows={4}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}
