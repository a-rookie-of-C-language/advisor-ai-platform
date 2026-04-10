import { useState, useEffect } from 'react'
import { Table, Input, Select, Button, Space, Card, Tag, message } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import request from '../../api/request'

const { Search } = Input

interface Policy {
  id: number
  title: string
  category: string
  source: string
  publishedAt: string
  createdAt: string
}

const categoryOptions = [
  { value: '', label: '全部分类' },
  { value: '学生资助', label: '学生资助' },
  { value: '心理健康', label: '心理健康' },
  { value: '就业指导', label: '就业指导' },
  { value: '党建团建', label: '党建团建' },
  { value: '安全教育', label: '安全教育' },
]

export default function PolicyPage() {
  const [data, setData] = useState<Policy[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const fetchData = async (page = 1, kw = keyword, cat = category) => {
    setLoading(true)
    try {
      const res: any = await request.get('/policies', {
        params: { keyword: kw || undefined, category: cat || undefined, page: page - 1, size: pagination.pageSize },
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
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (v: string) => v ? <Tag color="red">{v}</Tag> : '-',
    },
    { title: '来源', dataIndex: 'source', key: 'source', width: 150 },
    { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt', width: 160 },
  ]

  return (
    <Card
      title="政策解读"
      extra={<Button type="primary" icon={<PlusOutlined />}>新增政策</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="搜索政策标题"
          allowClear
          onSearch={(v) => { setKeyword(v); fetchData(1, v, category) }}
          style={{ width: 260 }}
          prefix={<SearchOutlined />}
        />
        <Select
          value={category}
          options={categoryOptions}
          onChange={(v) => { setCategory(v); fetchData(1, keyword, v) }}
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
