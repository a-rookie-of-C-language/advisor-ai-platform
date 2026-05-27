import { FileTextOutlined } from '@ant-design/icons'
import { Collapse, Space, Tag, Typography } from 'antd'
import type { ChatMessage } from './chatMessageModel'
import { eventDisplayDetail, eventDisplayTitle, eventTagColor } from './chatMessageModel'

const { Text } = Typography

interface MessageEventsProps {
  msg: ChatMessage
}

export function MessageEvents({ msg }: MessageEventsProps) {
  if (!msg.events?.length) {
    return null
  }

  return (
    <Collapse
      ghost
      size="small"
      style={{ marginTop: 8 }}
      items={[{
        key: 'events',
        label: (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <FileTextOutlined style={{ marginRight: 4 }} />
            执行过程 {msg.events.length} 条
          </Text>
        ),
        children: (
          <Space direction="vertical" style={{ width: '100%' }}>
            {msg.events.map((item) => {
              const detail = eventDisplayDetail(item.event, item.payload)
              return (
                <div key={item.id} style={{ background: '#F8FAFC', borderRadius: 6, padding: '8px 12px' }}>
                  <Tag color={eventTagColor(item.event)} style={{ fontSize: 11, marginBottom: 4 }}>
                    {eventDisplayTitle(item.event, item.payload)}
                  </Tag>
                  {detail && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'pre-wrap' }}>
                      {detail}
                    </Text>
                  )}
                </div>
              )
            })}
          </Space>
        ),
      }]}
    />
  )
}
