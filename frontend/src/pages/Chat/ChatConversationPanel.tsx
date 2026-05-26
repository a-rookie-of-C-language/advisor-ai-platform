import { type RefObject, type UIEvent } from 'react'
import { Skeleton, Typography } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { type ChatSession } from './chatMessageModel'
import { MsgBubble } from './ChatMessageBubble'
import styles from './ChatPage.module.css'

const { Text, Title } = Typography

interface ChatConversationPanelProps {
  activeSession: ChatSession | null
  messagesLoading: boolean
  msgListRef: RefObject<HTMLDivElement>
  bottomRef: RefObject<HTMLDivElement>
  onMessageListScroll: (event: UIEvent<HTMLDivElement>) => void
}

export function ChatConversationPanel({
  activeSession,
  messagesLoading,
  msgListRef,
  bottomRef,
  onMessageListScroll,
}: ChatConversationPanelProps) {
  if (messagesLoading && (!activeSession || activeSession.messages.length === 0)) {
    return (
      <div className={styles.emptyChat}>
        <div style={{ width: 'min(780px, 100%)' }}>
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        </div>
      </div>
    )
  }

  if (!activeSession || activeSession.messages.length === 0) {
    return (
      <div className={styles.emptyChat}>
        <RobotOutlined style={{ fontSize: 52, color: '#CBD5E1', marginBottom: 16 }} />
        <Title level={4} style={{ color: '#94A3B8', marginBottom: 8 }}>
          开始和 AI 助手对话
        </Title>
        <Text type="secondary">输入问题后发送，系统会按流式返回答案。</Text>
      </div>
    )
  }

  return (
    <div className={styles.msgList} ref={msgListRef} onScroll={onMessageListScroll}>
      {activeSession.messages.map((msg) => (
        <MsgBubble key={msg.id} msg={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
