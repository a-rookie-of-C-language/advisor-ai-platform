import { useState, useEffect } from 'react'
import { Table, Input, Select, Button, Space, Card, Tag, message } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import request from '../../api/request'

const { Search } = Input

interface Method {
  id: number
  title: string
  scenario: string
  tags: string
  createdAt: string
}

const scenarioOptions = [
  { value: '', label: '全部场景' },
  { value: '新生入学', label: '新生入学' },
  { value: '学业预警', label: '学业预警' },
  { value: '毕业就业', label: '毕业就业' },
  { value: '心理疏导', label: '心理疏导' },
  { value: '党员发展', label: '党员发展' },
]

export default function MethodPage() {
  const [data, setData] = useState<Method[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [scenario, setScenario] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const fetchData = async (page = 1, kw = keyword, sc = scenario) => {
    setLoading(true)
    try {
      const res: any = await request.get('/methods', {
        params: { keyword: kw || undefined, scenario: sc || undefined, page: page - 1, size: pagination.pageSize },
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
    { title: '方法名称', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '适用场景',
      dataIndex: 'scenario',
      key: 'scenario',
      width: 140,
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (v: string) => v ? v.split(',').map((t) => <Tag key={t}>{t.trim()}</Tag>) : '-',
    },
    { title: '录入时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  ]

  return (
    <Card
      title="方法推荐"
      extra={<Button type="primary" icon={<PlusOutlined />}>新增方法</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="搜索方法名称"
          allowClear
          onSearch={(v) => { setKeyword(v); fetchData(1, v, scenario) }}
          style={{ width: 260 }}
          prefix={<SearchOutlined />}
        />
        <Select
          value={scenario}
          options={scenarioOptions}
          onChange={(v) => { setScenario(v); fetchData(1, keyword, v) }}
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
