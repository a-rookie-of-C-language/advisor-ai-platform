import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Tag } from 'antd'
import {
  UserOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons'
import { studentStatApi, type StatOverviewResponse } from '../../api/studentStatApi'
import { globalMessage } from '../../utils/globalMessage'
import styles from './StatOverviewPage.module.css'

export default function StatOverviewPage() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<StatOverviewResponse | null>(null)

  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await studentStatApi.getOverview()
      if (response.code === 200) {
        setStats(response.data)
      }
    } catch {
      globalMessage.error('加载统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStats()
  }, [])

  const taskColumns = [
    {
      title: '状态',
      dataIndex: 'label',
      key: 'label',
      width: 120,
      render: (text: string, record: { color: string }) => (
        <Tag color={record.color}>{text}</Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'value',
      key: 'value',
      width: 100,
    },
    {
      title: '占比',
      dataIndex: 'percent',
      key: 'percent',
      width: 150,
      render: (percent: string) => <span style={{ color: '#666' }}>{percent}</span>,
    },
  ]

  const infoColumns = [
    {
      title: '类型',
      dataIndex: 'label',
      key: 'label',
      width: 120,
      render: (text: string, record: { color: string }) => (
        <Tag color={record.color}>{text}</Tag>
      ),
    },
    {
      title: '人数',
      dataIndex: 'value',
      key: 'value',
      width: 100,
    },
    {
      title: '占比',
      dataIndex: 'percent',
      key: 'percent',
      width: 150,
    },
  ]

  if (!stats) {
    return null
  }

  const totalTasks = stats.pendingTasks + stats.processingTasks + stats.completedTasks
  const taskData = [
    {
      label: '待处理',
      value: stats.pendingTasks,
      color: 'default',
      percent: totalTasks > 0 ? ((stats.pendingTasks / totalTasks) * 100).toFixed(1) + '%' : '0%',
    },
    {
      label: '处理中',
      value: stats.processingTasks,
      color: 'processing',
      percent: totalTasks > 0 ? ((stats.processingTasks / totalTasks) * 100).toFixed(1) + '%' : '0%',
    },
    {
      label: '已完成',
      value: stats.completedTasks,
      color: 'success',
      percent: totalTasks > 0 ? ((stats.completedTasks / totalTasks) * 100).toFixed(1) + '%' : '0%',
    },
  ]

  const totalInfo = stats.completeInfoCount + stats.partialMissingCount + stats.severeMissingCount
  const infoData = [
    {
      label: '信息完整',
      value: stats.completeInfoCount,
      color: 'green',
      percent: totalInfo > 0 ? ((stats.completeInfoCount / totalInfo) * 100).toFixed(1) + '%' : '0%',
    },
    {
      label: '部分缺失',
      value: stats.partialMissingCount,
      color: 'orange',
      percent: totalInfo > 0 ? ((stats.partialMissingCount / totalInfo) * 100).toFixed(1) + '%' : '0%',
    },
    {
      label: '严重缺失',
      value: stats.severeMissingCount,
      color: 'red',
      percent: totalInfo > 0 ? ((stats.severeMissingCount / totalInfo) * 100).toFixed(1) + '%' : '0%',
    },
  ]

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>学生数据概览</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="学生总数"
              value={stats.totalStudents}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#2563EB' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="在校学生"
              value={stats.totalActive}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#16A34A' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="信息缺失待处理"
              value={stats.missingInfoCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#EA580C' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="待处理任务"
              value={stats.pendingTasks}
              prefix={<FieldTimeOutlined />}
              valueStyle={{ color: '#9333EA' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="信息完整度分布" loading={loading}>
            <Table
              columns={infoColumns}
              dataSource={infoData}
              rowKey="label"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="任务状态分布" loading={loading}>
            <Table
              columns={taskColumns}
              dataSource={taskData}
              rowKey="label"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}