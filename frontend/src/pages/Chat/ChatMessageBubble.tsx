import { Space, Typography } from 'antd'
import {
  LoadingOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { type ChatMessage } from './chatMessageModel'
import {
  MessageAttachments,
  MessageEvents,
  MessageSources,
  MessageToolCalls,
} from './ChatMessageDetails'
import { ChatReasoningTrace } from './ChatReasoningTrace'
import { ChatTaskPlanChecklist } from './ChatTaskPlanChecklist'
import styles from './ChatPage.module.css'

const { Text } = Typography

interface MsgBubbleProps {
  msg: ChatMessage
}


export function MsgBubble({ msg }: MsgBubbleProps) {
  const isUser = msg.role === 'user'

  return (
    <div className={`${styles.msgRow} ${isUser ? styles.msgRowUser : styles.msgRowAI}`}>
      <div className={styles.msgAvatar}>
        {isUser
          ? <div className={styles.avatarUser}><UserOutlined /></div>
          : <div className={styles.avatarAI}><RobotOutlined /></div>}
      </div>
      <div className={`${styles.msgBubble} ${isUser ? styles.bubbleUser : styles.bubbleAI}`}>
        <MessageAttachments msg={msg} />

        {msg.streaming && !msg.content
          ? (
            <Space size={8}>
              <LoadingOutlined style={{ color: '#2563EB' }} />
              <Text type="secondary">{msg.progressText || '妯″瀷鎬濊€冧腑锛岃绋嶅€?..'}</Text>
            </Space>
            )
          : isUser
            ? <Text>{msg.content}</Text>
            : (
              <div className={styles.markdownBody}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.streaming && <span className={styles.cursor} />}
              </div>
            )}

        {!isUser && <ChatReasoningTrace msg={msg} />}
        {!isUser && <ChatTaskPlanChecklist msg={msg} />}
        <MessageSources msg={msg} />
        <MessageEvents msg={msg} />
        <MessageToolCalls msg={msg} />
      </div>
    </div>
  )
}
