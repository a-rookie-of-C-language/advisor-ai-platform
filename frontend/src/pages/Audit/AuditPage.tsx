import { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  DatePicker,
  Select,
  Modal,
  Descriptions,
  Typography,
  App,
} from 'antd'
import {
  ReloadOutlined,
  EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { auditApi, type AuditLogDTO, type AuditModule, type AuditAction } from '../../api/auditApi'
import dayjs from 'dayjs'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

const moduleColors: Record<AuditModule, string> = {
  AUTH: 'blue',
  RAG: 'green',
  MEMORY: 'purple',
  CHAT: 'orange',
}

const moduleLabels: Record<AuditModule, string> = {
  AUTH: '认证',
  RAG: '知识库',
  MEMORY: '记忆',
  CHAT: '对话',
}

const actionLabels: Record<AuditAction, string> = {
  LOGIN: '登录',
  LOGOUT: '登出',
  SEARCH: '搜索',
  QUERY: '查询',
  UPLOAD_DOCUMENT: '上传文档',
  DELETE_DOCUMENT: '删除文档',
  STORE: '存储',
  RETRIEVE: '检索',
  UPDATE: '更新',
  DELETE: '删除',
  CHAT: '对话',
  STREAM_CHAT: '流式对话',
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  return '请求失败，请稍后重试'
}

interface QueryParams {
  module?: AuditModule
  action?: AuditAction
  startTime?: string
  endTime?: string
  page: number
  size: number
}

export default function AuditPage() {
  const { message: messageApi } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AuditLogDTO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [selectedLog, setSelectedLog] = useState<AuditLogDTO | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [queryParams, setQueryParams] = useState<QueryParams>({
    page: 1,
    size: 20,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await auditApi.getAuditLogs(queryParams)
      setData(res.records)
      setTotal(res.total)
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [queryParams])

  const handleFilterChange = (key: keyof QueryParams, value: QueryParams[keyof QueryParams]) => {
    setQueryParams((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleReset = () => {
    setQueryParams({ page: 1, size: 20 })
  }

  const handlePageChange = (newPage: number, newSize: number) => {
    setPage(newPage)
    setSize(newSize)
    setQueryParams((prev) => ({ ...prev, page: newPage, size: newSize }))
  }

  const handleViewDetail = async (record: AuditLogDTO) => {
    setSelectedLog(record)
    setDetailVisible(true)
  }

  const formatJson = (str: string | null) => {
    if (!str) return '-'
    try {
      return JSON.stringify(JSON.parse(str), null, 2)
    } catch {
      return str
    }
  }

  const columns: ColumnsType<AuditLogDTO> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '用户',
      dataIndex: 'username',
      width: 100,
    },
    {
      title: '模块',
      dataIndex: 'module',
      width: 100,
      render: (val: AuditModule) => (
        <Tag color={moduleColors[val]}>{moduleLabels[val]}</Tag>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 100,
      render: (val: AuditAction) => actionLabels[val] || val,
    },
    {
      title: '请求路径',
      dataIndex: 'requestUri',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'responseStatus',
      width: 100,
      render: (val) => (
        <Tag color={val === 'SUCCESS' ? 'green' : 'red'}>{val === 'SUCCESS' ? '成功' : '失败'}</Tag>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      width: 100,
      render: (val) => `${val}ms`,
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      width: 140,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={<Title level={4}>审计日志</Title>}
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void loadData()}>
            刷新
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <FilterOutlined />
            <Select
              placeholder="选择模块"
              allowClear
              style={{ width: 120 }}
              value={queryParams.module}
              onChange={(val) => handleFilterChange('module', val)}
              options={Object.entries(moduleLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Select
              placeholder="选择操作"
              allowClear
              style={{ width: 120 }}
              value={queryParams.action}
              onChange={(val) => handleFilterChange('action', val)}
              options={Object.entries(actionLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <RangePicker
              showTime
              value={[
                queryParams.startTime ? dayjs(queryParams.startTime) : null,
                queryParams.endTime ? dayjs(queryParams.endTime) : null,
              ]}
              onChange={(dates) => {
                handleFilterChange(
                  'startTime',
                  dates?.[0]?.toISOString()
                )
                handleFilterChange('endTime', dates?.[1]?.toISOString())
              }}
            />
            <Button onClick={handleReset}>重置</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{
              current: page,
              pageSize: size,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (t) => `共 ${t} 条`,
              onChange: handlePageChange,
            }}
          />
        </Space>
      </Card>

      <Modal
        title="日志详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          <Button onClick={() => setDetailVisible(false)}>关闭</Button>
        }
        width={800}
      >
        {selectedLog && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="ID">{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="用户名">{selectedLog.username}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{selectedLog.userId}</Descriptions.Item>
            <Descriptions.Item label="模块">
              <Tag color={moduleColors[selectedLog.module]}>{moduleLabels[selectedLog.module]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="操作">
              {actionLabels[selectedLog.action] || selectedLog.action}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedLog.responseStatus === 'SUCCESS' ? 'green' : 'red'}>
                {selectedLog.responseStatus === 'SUCCESS' ? '成功' : '失败'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="方法">{selectedLog.method}</Descriptions.Item>
            <Descriptions.Item label="耗时">{selectedLog.durationMs}ms</Descriptions.Item>
            <Descriptions.Item label="请求路径" span={2}>
              {selectedLog.requestUri}
            </Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedLog.ipAddress}</Descriptions.Item>
            <Descriptions.Item label="User Agent" span={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedLog.userAgent}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="请求参数" span={2}>
              <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                {formatJson(selectedLog.requestParams)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="响应数据" span={2}>
              <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                {formatJson(selectedLog.responseData)}
              </pre>
            </Descriptions.Item>
            {selectedLog.errorMessage && (
              <Descriptions.Item label="错误信息" span={2}>
                <Text type="danger">{selectedLog.errorMessage}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}