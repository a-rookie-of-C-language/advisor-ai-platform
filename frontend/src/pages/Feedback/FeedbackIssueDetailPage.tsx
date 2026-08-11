import { useEffect, useState } from 'react'
import { Button, Card, Descriptions, Empty, Input, message, Space, Spin, Tag, Typography } from 'antd'
import { GithubOutlined, ReloadOutlined, RollbackOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { feedbackApi, type GitHubSyncStatus, type IssueDTO } from '../../api/feedbackApi'
import FeedbackIssueCloseModal from './FeedbackIssueCloseModal'
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

export default function FeedbackIssueDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const issueId = Number(id)
  const [issue, setIssue] = useState<IssueDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const loadIssue = async () => {
    if (!Number.isFinite(issueId)) {
      return
    }
    setLoading(true)
    try {
      const res = await feedbackApi.getIssue(issueId)
      setIssue(res.data)
    } catch (error) {
      message.error(String(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadIssue()
  }, [issueId])

  const handleComment = async () => {
    const content = comment.trim()
    if (!content) {
      message.warning('请输入评论内容')
      return
    }
    setCommenting(true)
    try {
      const res = await feedbackApi.createComment(issueId, { content })
      setIssue((prev) => prev ? { ...prev, comments: [...(prev.comments || []), res.data] } : prev)
      setComment('')
      message.success('评论已提交')
    } catch (error) {
      message.error(String(error))
    } finally {
      setCommenting(false)
    }
  }

  const handleClose = async (values: { reason: string }) => {
    setClosing(true)
    try {
      const res = await feedbackApi.closeIssue(issueId, values)
      setIssue(res.data)
      setCloseOpen(false)
      message.success('反馈已关闭')
    } catch (error) {
      message.error(String(error))
    } finally {
      setClosing(false)
    }
  }

  const handleRetryGitHubSync = async () => {
    setRetrying(true)
    try {
      const res = await feedbackApi.retryGitHubSync(issueId)
      setIssue(res.data)
      message.success('GitHub 同步已重试')
    } catch (error) {
      message.error(String(error))
    } finally {
      setRetrying(false)
    }
  }

  if (loading && !issue) {
    return <Spin />
  }

  if (!issue) {
    return <Empty description="反馈不存在" />
  }

  const hasPendingGitHubSync =
    issue.githubSyncStatus !== 'SYNCED'
    || issue.comments?.some((item) => item.githubSyncStatus !== 'SYNCED')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <Button icon={<RollbackOutlined />} onClick={() => navigate('/issues')}>
            返回
          </Button>
          <h1>{issue.title}</h1>
          <Space wrap>
            <Tag color={issue.status === 'OPEN' ? 'blue' : 'default'}>
              {issue.status === 'OPEN' ? '开放' : '已关闭'}
            </Tag>
            <Tag color={syncStatusColor[issue.githubSyncStatus]}>
              {syncStatusText[issue.githubSyncStatus]}
            </Tag>
            {issue.githubIssueUrl ? (
              <Typography.Link href={issue.githubIssueUrl} target="_blank" rel="noreferrer">
                <GithubOutlined /> GitHub #{issue.githubIssueNumber}
              </Typography.Link>
            ) : null}
          </Space>
        </div>
        <Space>
          {hasPendingGitHubSync ? (
            <Button
              icon={<ReloadOutlined />}
              loading={retrying}
              onClick={handleRetryGitHubSync}
            >
              重试 GitHub 同步
            </Button>
          ) : null}
          {issue.status === 'OPEN' && issue.canClose ? (
            <Button danger onClick={() => setCloseOpen(true)}>
              关闭反馈
            </Button>
          ) : null}
        </Space>
      </div>

      <div className={styles.detailLayout}>
        <div className={styles.mainColumn}>
          <Card title="内容">
            <div className={styles.contentText}>{issue.content}</div>
          </Card>

          <Card title="评论">
            <div className={styles.commentList}>
              {(issue.comments || []).length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无评论" />
              ) : (
                issue.comments?.map((item) => (
                  <Card key={item.id} size="small">
                    <div className={styles.commentMeta}>
                      <span>{item.createdByRealName || item.createdByUsername || '未知用户'}</span>
                      <Space size={6}>
                        <Tag color={syncStatusColor[item.githubSyncStatus]}>
                          {syncStatusText[item.githubSyncStatus]}
                        </Tag>
                        <span>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                      </Space>
                    </div>
                    <div className={styles.commentText}>{item.content}</div>
                  </Card>
                ))
              )}
              {issue.status === 'OPEN' ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input.TextArea
                    rows={4}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="追加评论"
                  />
                  <Button type="primary" loading={commenting} onClick={handleComment}>
                    发表评论
                  </Button>
                </Space>
              ) : null}
            </div>
          </Card>
        </div>

        <div className={styles.sideColumn}>
          <Card title="信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="发起人">
                {issue.createdByRealName || issue.createdByUsername || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(issue.createdAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(issue.updatedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="GitHub 状态">{issue.githubState || '-'}</Descriptions.Item>
              <Descriptions.Item label="同步时间">
                {issue.githubLastSyncedAt ? dayjs(issue.githubLastSyncedAt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          {issue.closeReason ? (
            <Card title="关闭理由">
              <div className={styles.contentText}>{issue.closeReason}</div>
            </Card>
          ) : null}
        </div>
      </div>

      <FeedbackIssueCloseModal
        open={closeOpen}
        loading={closing}
        onCancel={() => setCloseOpen(false)}
        onSubmit={handleClose}
      />
    </div>
  )
}
