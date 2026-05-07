import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Form,
  Popconfirm,
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { studentApi, type StudentDetailResponse, type StudentQueryRequest } from '../../api/studentApi'
import { globalMessage } from '../../utils/globalMessage'
import styles from './StudentListPage.module.css'

const { Option } = Select

const INFO_COMPLETENESS_OPTIONS = [
  { value: 0, label: '完整', color: 'green' },
  { value: 1, label: '部分缺失', color: 'orange' },
  { value: 2, label: '严重缺失', color: 'red' },
]

const RISK_LEVEL_OPTIONS = [
  { value: 0, label: '正常', color: 'green' },
  { value: 1, label: '关注', color: 'blue' },
  { value: 2, label: '预警', color: 'orange' },
  { value: 3, label: '严重', color: 'red' },
]

export default function StudentListPage() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<StudentDetailResponse[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [searchForm] = Form.useForm()

  const loadData = async (page = pagination.current, size = pagination.pageSize, params: StudentQueryRequest = {}) => {
    setLoading(true)
    try {
      const queryParams = {
        page: page - 1,
        size: size || 10,
        ...params,
      }
      const response = await studentApi.list(queryParams)
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

  const handleDelete = async (id: number) => {
    try {
      const response = await studentApi.delete(id)
      if (response.code === 200) {
        globalMessage.success('删除成功')
        void loadData()
      }
    } catch {
      globalMessage.error('删除失败')
    }
  }

  const handleDownloadTemplate = () => {
    window.open('/api/student/import/template', '_blank')
  }

  const columns = [
    {
      title: '学号',
      dataIndex: 'studentNo',
      key: 'studentNo',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '性别',
      dataIndex: 'genderText',
      key: 'genderText',
      width: 60,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
    },
    {
      title: '专业',
      dataIndex: 'major',
      key: 'major',
      width: 150,
    },
    {
      title: '班级',
      dataIndex: 'classCode',
      key: 'classCode',
      width: 120,
    },
    {
      title: '辅导员',
      dataIndex: 'counselorNo',
      key: 'counselorNo',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '信息完整度',
      dataIndex: 'infoCompletenessText',
      key: 'infoCompletenessText',
      width: 100,
      render: (text: string, record: StudentDetailResponse) => {
        const option = INFO_COMPLETENESS_OPTIONS.find((o) => o.value === record.infoCompleteness)
        return <Tag color={option?.color}>{text}</Tag>
      },
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevelText',
      key: 'riskLevelText',
      width: 80,
      render: (text: string, record: StudentDetailResponse) => {
        const option = RISK_LEVEL_OPTIONS.find((o) => o.value === record.riskLevel)
        return <Tag color={option?.color}>{text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: StudentDetailResponse) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />}>
            编辑
          </Button>
          <Popconfirm title="确认删除该学生？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>学生管理</h2>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载导入模板
          </Button>
          <Button type="primary" icon={<PlusOutlined />}>
            新增学生
          </Button>
        </Space>
      </div>

      <div className={styles.searchArea}>
        <Form form={searchForm} layout="inline" className={styles.searchForm}>
          <Form.Item name="studentNo" label="学号">
            <Input placeholder="请输入学号" style={{ width: 120 }} allowClear />
          </Form.Item>
          <Form.Item name="name" label="姓名">
            <Input placeholder="请输入姓名" style={{ width: 100 }} allowClear />
          </Form.Item>
          <Form.Item name="grade" label="年级">
            <Input placeholder="请输入年级" style={{ width: 100 }} allowClear />
          </Form.Item>
          <Form.Item name="classCode" label="班级">
            <Input placeholder="请输入班级" style={{ width: 120 }} allowClear />
          </Form.Item>
          <Form.Item name="infoCompleteness" label="信息完整度">
            <Select placeholder="请选择" style={{ width: 100 }} allowClear>
              {INFO_COMPLETENESS_OPTIONS.map((o) => (
                <Option key={o.value} value={o.value}>
                  {o.label}
                </Option>
              ))}
            </Select>
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
    </div>
  )
}