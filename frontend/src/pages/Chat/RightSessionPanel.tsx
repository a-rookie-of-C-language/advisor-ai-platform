import { Button, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import styles from './ChatPage.module.css'

const { Text, Title } = Typography

interface SessionItem {
  id: number
  title: string
  updatedAt: string
  kbId: number
}

interface RightSessionPanelProps {
  sessions: SessionItem[]
  activeId: number | null
  onNewSession: () => void
  onSelectSession: (id: number) => void
  onDeleteSession: (id: number) => void
  getKnowledgeBaseName: (kbId: number) => ReactNode
}

export default function RightSessionPanel(props: RightSessionPanelProps) {
  const {
    sessions,
    activeId,
    onNewSession,
    onSelectSession,
    onDeleteSession,
    getKnowledgeBaseName,
  } = props

  return (
    <aside className={styles.rightPanel}>
      <div className={styles.rightPanelTop}>
        <Title level={5} style={{ margin: 0, color: '#fff' }}>AI 对话</Title>
      </div>
      <div className={styles.sidebarHeader}>
        <Title level={5} style={{ margin: 0, color: '#fff' }}>对话列表</Title>
        <Tooltip title="新建对话">
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={onNewSession}
            style={{ color: '#fff' }}
          />
        </Tooltip>
      </div>

      <div className={styles.sessionList}>
        {sessions.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>暂无会话</Text>
          </div>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={`${styles.sessionItem} ${session.id === activeId ? styles.sessionItemActive : ''}`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className={styles.sessionTitle}>{session.title}</div>
            <div className={styles.sessionMeta}>
              <Space size={6} wrap>
                <Tag color={session.kbId > 0 ? 'blue' : 'default'} style={{ marginInlineEnd: 0 }}>
                  {getKnowledgeBaseName(session.kbId)}
                </Tag>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{session.updatedAt}</Text>
              </Space>
              <Popconfirm
                title="确认删除该会话吗？"
                onConfirm={(event) => {
                  event?.stopPropagation()
                  onDeleteSession(session.id)
                }}
                onCancel={(event) => event?.stopPropagation()}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  className={styles.deleteBtn}
                  onClick={(event) => event.stopPropagation()}
                />
              </Popconfirm>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
