import { useState, useEffect } from 'react'
import { Table, Input, Select, Button, Space, Card, Tag, message } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import request from '../../api/request'

const { Search } = Input

interface CaseStudy {
  id: number
  title: string
  category: string
  tags: string
  school: string
  createdAt: string
}

const categoryOptions = [
  { value: '', label: '全部分类' },
  { value: '思想引领', label: '思想引领' },
  { value: '心理危机', label: '心理危机' },
  { value: '学业帮扶', label: '学业帮扶' },
  { value: '就业引导', label: '就业引导' },
  { value: '红色教育', label: '红色教育' },
]

export default function CasePage() {
  const [data, setData] = useState<CaseStudy[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const fetchData = async (page = 1, kw = keyword, cat = category) => {
    setLoading(true)
    try {
      const res: any = await request.get('/cases', {
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
    { title: '案例标题', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (v: string) => v ? <Tag color="volcano">{v}</Tag> : '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (v: string) => v ? v.split(',').map((t) => <Tag key={t}>{t.trim()}</Tag>) : '-',
    },
    { title: '来源学校', dataIndex: 'school', key: 'school', width: 150 },
    { title: '录入时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  ]

  return (
    <Card
      title="案例检索"
      extra={<Button type="primary" icon={<PlusOutlined />}>新增案例</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="搜索案例标题或标签"
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
