import { useState, useEffect } from 'react'
import { Table, Input, Select, Button, Space, Card, Tag, message } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import request from '../../api/request'

const { Search } = Input

interface Training {
  id: number
  title: string
  type: string
  resourceUrl: string
  scheduledAt: string
  createdAt: string
}

const typeOptions = [
  { value: '', label: '全部类型' },
  { value: '线上课程', label: '线上课程' },
  { value: '线下培训', label: '线下培训' },
  { value: '专题讲座', label: '专题讲座' },
  { value: '实践活动', label: '实践活动' },
]

export default function TrainingPage() {
  const [data, setData] = useState<Training[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const fetchData = async (page = 1, kw = keyword, t = type) => {
    setLoading(true)
    try {
      const res: any = await request.get('/trainings', {
        params: { keyword: kw || undefined, type: t || undefined, page: page - 1, size: pagination.pageSize },
      })
      setData(res.data.content)
      setPagination((p) => ({ ...p, current: page, total: res.data.totalElements }))
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const columns = [
    { title: '培训标题', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: string) => v ? <Tag color="green">{v}</Tag> : '-',
    },
    { title: '计划时间', dataIndex: 'scheduledAt', key: 'scheduledAt', width: 160 },
    {
      title: '资源链接',
      dataIndex: 'resourceUrl',
      key: 'resourceUrl',
      width: 120,
      render: (v: string) =>
        v ? <a href={v} target="_blank" rel="noreferrer">查看</a> : '-',
    },
    { title: '录入时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  ]

  return (
    <Card
      title="培训支持"
      extra={<Button type="primary" icon={<PlusOutlined />}>新增培训</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="搜索培训标题"
          allowClear
          onSearch={(v) => { setKeyword(v); fetchData(1, v, type) }}
          style={{ width: 260 }}
          prefix={<SearchOutlined />}
        />
        <Select
          value={type}
          options={typeOptions}
          onChange={(v) => { setType(v); fetchData(1, keyword, v) }}
          style={{ width: 150 }}
        />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          ...pagination,
          onChange: (page) => fetchData(page),
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </Card>
  )
}
