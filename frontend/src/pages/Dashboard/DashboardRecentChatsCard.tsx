import { Avatar, Card, List, Tag, Typography } from 'antd'
import { ClockCircleOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons'
import { recentChats } from './dashboardData'

const { Text } = Typography

export default function DashboardRecentChatsCard() {
  return (
    <Card
      title={(
        <span>
          <MessageOutlined style={{ marginRight: 8, color: '#2563EB' }} />
          最近对话
        </span>
      )}
      bordered={false}
      style={{ borderRadius: 10, border: '1px solid #E2E8F0' }}
    >
      <List
        dataSource={recentChats}
        renderItem={(item) => (
          <List.Item style={{ padding: '10px 0', cursor: 'pointer' }}>
            <List.Item.Meta
              avatar={<Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#2563EB' }} />}
              title={<Text style={{ fontSize: 14 }}>{item.title}</Text>}
              description={(
                <span>
                  <Tag color="blue" style={{ fontSize: 11 }}>{item.tag}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {item.time}
                  </Text>
                </span>
              )}
            />
          </List.Item>
        )}
      />
    </Card>
  )
}
