import { FileTextOutlined } from '@ant-design/icons'
import { Collapse, Space, Tag, Typography } from 'antd'
import type { ChatMessage } from './chatMessageModel'

const { Text } = Typography

interface MessageSourcesProps {
  msg: ChatMessage
}

export function MessageSources({ msg }: MessageSourcesProps) {
  if (!msg.sources?.length) {
    return null
  }

  return (
    <Collapse
      ghost
      size="small"
      style={{ marginTop: 8 }}
      items={[{
        key: '1',
        label: (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <FileTextOutlined style={{ marginRight: 4 }} />
            寮曠敤鏉ユ簮 {msg.sources.length} 鏉?          </Text>
        ),
        children: (
          <Space direction="vertical" style={{ width: '100%' }}>
            {msg.sources.map((source) => (
              <div key={source.id} style={{ background: '#F1F5F9', borderRadius: 6, padding: '8px 12px' }}>
                <Tag color="blue" style={{ fontSize: 11, marginBottom: 4 }}>{source.docName}</Tag>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{source.snippet}</Text>
              </div>
            ))}
          </Space>
        ),
      }]}
    />
  )
}
