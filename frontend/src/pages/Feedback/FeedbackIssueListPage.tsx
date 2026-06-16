import { useEffect, useMemo, useState } from 'react'
import { Button, Card, message, Space, Table, Tag, Typography } from 'antd'
import { GithubOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { feedbackApi, type GitHubSyncStatus, type IssueDTO } from '../../api/feedbackApi'
import FeedbackIssueCreateModal from './FeedbackIssueCreateModal'
import styles from './FeedbackPage.module.css'

const syncStatusColor: Record<GitHubSyncStatus, string> = {
  PENDING: 'gold',
  SYNCED: 'green',
  FAILED: 'red',
}

const syncStatusText: Record<GitHubSyncStatus, string> = {
  PENDING: '待同步',
  SYNCED: '已同步',
  FAILED: '同步失败',
}

export default function FeedbackIssueListPage() {
  const navigate = useNavigate()
  const [issues, setIssues] = useState<IssueDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const loadIssues = async () => {
    setLoading(true)
    try {
      const res = await feedbackApi.listIssues()
      setIssues(res.data)
    } catch (error) {
      message.error(String(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadIssues()
  }, [])

  const columns = useMemo(
    () => [
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        render: (_: string, issue: IssueDTO) => (
          <button
            type="button"
            className="link-button"
            onClick={() => navigate(`/issues/${issue.id}`)}
          >
            <span className={styles.issueTitle}>
              <span className={styles.issueTitleText}>{issue.title}</span>
              {issue.githubIssueNumber ? <Tag>#{issue.githubIssueNumber}</Tag> : null}
            </span>
          </button>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: IssueDTO['status']) => (
          <Tag color={status === 'OPEN' ? 'blue' : 'default'}>{status === 'OPEN' ? '开放' : '已关闭'}</Tag>
        ),
      },
      {
        title: 'GitHub',
        dataIndex: 'githubState',
        key: 'githubState',
        width: 160,
        render: (_: string, issue: IssueDTO) => (
          <Space size={6}>
            <Tag color={syncStatusColor[issue.githubSyncStatus]}>{syncStatusText[issue.githubSyncStatus]}</Tag>
            {issue.githubIssueUrl ? (
              <Typography.Link href={issue.githubIssueUrl} target="_blank" rel="noreferrer">
                <GithubOutlined />
              </Typography.Link>
            ) : null}
          </Space>
        ),
      },
      {
        title: '发起人',
        dataIndex: 'createdByRealName',
        key: 'createdByRealName',
        width: 140,
        render: (_: string, issue: IssueDTO) => issue.createdByRealName || issue.createdByUsername || '-',
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 180,
        render: (updatedAt: string) => dayjs(updatedAt).format('YYYY-MM-DD HH:mm'),
      },
    ],
    [navigate],
  )

  const handleCreate = async (values: { title: string; content: string }) => {
    setCreating(true)
    try {
      const res = await feedbackApi.createIssue(values)
      message.success('反馈已提交')
      setCreateOpen(false)
      setIssues((prev) => [res.data, ...prev])
      navigate(`/issues/${res.data.id}`)
    } catch (error) {
      message.error(String(error))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1>反馈</h1>
          <p>提交问题、功能建议，并与 GitHub Issue 保持同步。</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建反馈
        </Button>
      </div>
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={issues}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      <FeedbackIssueCreateModal
        open={createOpen}
        loading={creating}
        onCancel={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
