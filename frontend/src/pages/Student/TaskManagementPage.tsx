import { useEffect, useState } from 'react'
import { Table, Button, Space, Tag, Select, Input, Modal, Form } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { studentTaskApi, type StudentTaskResponse, type TaskStatusUpdateRequest } from '../../api/studentTaskApi'
import { globalMessage } from '../../utils/globalMessage'
import styles from './TaskManagementPage.module.css'

const { Option } = Select

const TASK_STATUS_OPTIONS = [
  { value: 0, label: '待处理', color: 'default' },
  { value: 1, label: '处理中', color: 'processing' },
  { value: 2, label: '已完成', color: 'success' },
  { value: 3, label: '已关闭', color: 'default' },
]

const TASK_TYPE_OPTIONS = [
  { value: 0, label: '信息缺失', color: 'red' },
]

export default function TaskManagementPage() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<StudentTaskResponse[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [searchForm] = Form.useForm()
  const [handleModalVisible, setHandleModalVisible] = useState(false)
  const [currentTask, setCurrentTask] = useState<StudentTaskResponse | null>(null)
  const [handleForm] = Form.useForm()

  const loadData = async (page = pagination.current, size = pagination.pageSize, params: Record<string, unknown> = {}) => {
    setLoading(true)
    try {
      const queryParams = {
        page: page - 1,
        size: size || 10,
        ...params,
      }
      const response = await studentTaskApi.list(queryParams)
      if (response.code === 200) {
        setDataSource(response.data.content || [])
        setPagination((prev) => ({
          ...prev,
          total: response.data.totalElements || 0,
        }))
      }
    } catch {
      globalMessage.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleSearch = () => {
    const values = searchForm.getFieldsValue()
    setPagination((prev) => ({ ...prev, current: 1 }))
    void loadData(1, pagination.pageSize, values)
  }

  const handleReset = () => {
    searchForm.resetFields()
    void loadData()
  }

  const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
    const newPage = paginationConfig.current || 1
    const newSize = paginationConfig.pageSize || pagination.pageSize
    setPagination((prev) => ({
      ...prev,
      current: newPage,
      pageSize: newSize,
    }))
    const values = searchForm.getFieldsValue()
    void loadData(newPage, newSize, values)
  }

  const openHandleModal = (task: StudentTaskResponse) => {
    setCurrentTask(task)
    handleForm.setFieldsValue({
      taskStatus: task.taskStatus,
      handleNote: task.handleNote,
    })
    setHandleModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await handleForm.validateFields()
      if (!currentTask) return

      const data: TaskStatusUpdateRequest = {
        taskStatus: values.taskStatus,
        handleNote: values.handleNote,
      }

      const response = await studentTaskApi.updateStatus(currentTask.id, data)
      if (response.code === 200) {
        globalMessage.success('处理成功')
        setHandleModalVisible(false)
        void loadData()
      }
    } catch {
      globalMessage.error('处理失败')
    }
  }

  const columns = [
    {
      title: '学号',
      dataIndex: 'studentNo',
      key: 'studentNo',
      width: 120,
    },
    {
      title: '学生姓名',
      dataIndex: 'studentName',
      key: 'studentName',
      width: 100,
    },
    {
      title: '任务类型',
      dataIndex: 'taskTypeText',
      key: 'taskTypeText',
      width: 100,
      render: (text: string, record: StudentTaskResponse) => {
        const option = TASK_TYPE_OPTIONS.find((o) => o.value === record.taskType)
        return <Tag color={option?.color}>{text}</Tag>
      },
    },
    {
      title: '任务状态',
      dataIndex: 'taskStatusText',
      key: 'taskStatusText',
      width: 100,
      render: (text: string, record: StudentTaskResponse) => {
        const option = TASK_STATUS_OPTIONS.find((o) => o.value === record.taskStatus)
        return <Tag color={option?.color}>{text}</Tag>
      },
    },
    {
      title: '负责人',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      width: 100,
    },
    {
      title: '任务描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: '处理备注',
      dataIndex: 'handleNote',
      key: 'handleNote',
      width: 200,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: StudentTaskResponse) => (
        <Button
          type="link"
          onClick={() => openHandleModal(record)}
          disabled={record.taskStatus === 2 || record.taskStatus === 3}
        >
          处理
        </Button>
      ),
    },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>学生任务管理</h2>
      </div>

      <div className={styles.searchArea}>
        <Form form={searchForm} layout="inline" className={styles.searchForm}>
          <Form.Item name="taskStatus" label="任务状态">
            <Select placeholder="请选择" style={{ width: 120 }} allowClear>
              {TASK_STATUS_OPTIONS.map((o) => (
                <Option key={o.value} value={o.value}>
                  {o.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="assigneeNo" label="负责人工号">
            <Input placeholder="请输入工号" style={{ width: 120 }} allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </div>

      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        className={styles.table}
      />

      <Modal
        title="处理任务"
        open={handleModalVisible}
        onOk={handleSubmit}
        onCancel={() => setHandleModalVisible(false)}
        okText="提交"
        cancelText="取消"
      >
        <Form form={handleForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="taskStatus" label="任务状态" rules={[{ required: true }]}>
            <Select>
              {TASK_STATUS_OPTIONS.map((o) => (
                <Option key={o.value} value={o.value}>
                  {o.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="handleNote" label="处理备注">
            <Input.TextArea rows={4} placeholder="请输入处理备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}