import { FileTextOutlined } from '@ant-design/icons'
import { Collapse, Space, Tag, Typography } from 'antd'
import type { ChatMessage } from './chatMessageModel'
import { renderToolPayload, renderToolResultSummary } from './chatMessageModel'

const { Text } = Typography

interface MessageToolCallsProps {
  msg: ChatMessage
}

export function MessageToolCalls({ msg }: MessageToolCallsProps) {
  if (msg.events?.length || !msg.toolCalls?.length) {
    return null
  }

  return (
    <Collapse
      ghost
      size="small"
      style={{ marginTop: 8 }}
      items={[{
        key: 'tools',
        label: (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <FileTextOutlined style={{ marginRight: 4 }} />
            宸ュ叿璋冪敤 {msg.toolCalls.length} 娆?          </Text>
        ),
        children: (
          <Space direction="vertical" style={{ width: '100%' }}>
            {msg.toolCalls.map((tool) => (
              <div key={tool.id} style={{ background: '#F8FAFC', borderRadius: 6, padding: '8px 12px' }}>
                <Tag color={tool.status === 'error' ? 'red' : 'geekblue'} style={{ fontSize: 11, marginBottom: 4 }}>
                  tool_call: {tool.toolName}
                </Tag>
                {tool.input !== undefined && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'pre-wrap' }}>
                    input: {renderToolPayload(tool.input)}
                  </Text>
                )}
                {(tool.message || tool.result) && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'pre-wrap' }}>
                    tool_result: {renderToolResultSummary(tool.toolName, tool.result)}
                  </Text>
                )}
              </div>
            ))}
          </Space>
        ),
      }]}
    />
  )
}
