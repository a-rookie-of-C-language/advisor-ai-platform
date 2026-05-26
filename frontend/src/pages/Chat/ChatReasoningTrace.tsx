import { Space, Tag, Typography } from 'antd'
import {
  type ChatMessage,
  eventDisplayDetail,
  reasoningEventsFromMessage,
  reasoningStageLabel,
} from './chatMessageModel'
import styles from './ChatPage.module.css'

const { Text } = Typography

interface ChatReasoningTraceProps {
  msg: ChatMessage
}

export function ChatReasoningTrace({ msg }: ChatReasoningTraceProps) {
  const reasoningEvents = reasoningEventsFromMessage(msg.events)
  if (!reasoningEvents.length || msg.role !== 'assistant') {
    return null
  }

  return (
    <div className={styles.reasoningTrace}>
      <Text type="secondary" className={styles.reasoningTraceTitle}>
        鎵ц鎬濊矾
      </Text>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {reasoningEvents.map((item) => {
          const payload = item.payload
          const stage = typeof payload.stage === 'string' ? payload.stage : ''
          const agentName = typeof payload.agent_name === 'string' ? payload.agent_name : ''
          return (
            <div key={item.id} className={styles.reasoningTraceItem}>
              <div className={styles.reasoningTraceMeta}>
                <Tag color="blue" style={{ fontSize: 11, marginBottom: 0 }}>
                  {reasoningStageLabel(stage)}
                </Tag>
                {agentName && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {agentName}
                  </Text>
                )}
              </div>
              <Text type="secondary" className={styles.reasoningTraceText}>
                {eventDisplayDetail(item.event, payload)}
              </Text>
            </div>
          )
        })}
      </Space>
    </div>
  )
}
