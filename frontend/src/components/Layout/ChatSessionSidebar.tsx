import { Button, Popconfirm, Tooltip, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { ChatSessionDTO } from '../../api/chatApi'
import styles from './MainLayout.module.css'

const { Text } = Typography

interface ChatSessionSidebarProps {
  sessions: ChatSessionDTO[]
  activeSessionId: number | null
  onCreate: () => void
  onSelect: (sessionId: number) => void
  onDelete: (sessionId: number) => void
}

export default function ChatSessionSidebar(props: ChatSessionSidebarProps) {
  const { sessions, activeSessionId, onCreate, onSelect, onDelete } = props

  return (
    <div className={styles.chatSessionBox}>
      <div className={styles.chatSessionHeader}>
        <Text className={styles.chatSessionTitle}>对话列表</Text>
        <Tooltip title="新建对话">
          <Button type="text" icon={<PlusOutlined />} onClick={onCreate} className={styles.chatSessionAddBtn} />
        </Tooltip>
      </div>
      <div className={styles.chatSessionList}>
        {sessions.length === 0 && <div className={styles.chatSessionEmpty}>暂无会话</div>}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`${styles.chatSessionItem} ${session.id === activeSessionId ? styles.chatSessionItemActive : ''}`}
            onClick={() => onSelect(session.id)}
          >
            <div className={styles.chatSessionItemTitle}>{session.title}</div>
            <Popconfirm
              title="确认删除该会话吗？"
              onConfirm={(event) => {
                event?.stopPropagation()
                onDelete(session.id)
              }}
              onCancel={(event) => event?.stopPropagation()}
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                className={styles.chatSessionDeleteBtn}
                onClick={(event) => event.stopPropagation()}
              />
            </Popconfirm>
          </div>
        ))}
      </div>
    </div>
  )
}
