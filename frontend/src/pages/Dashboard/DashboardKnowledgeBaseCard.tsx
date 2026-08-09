import { Avatar, Card, List, Tag, Typography } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import { knowledgeBaseSummaries } from './dashboardData'

const { Text } = Typography

export default function DashboardKnowledgeBaseCard() {
  return (
    <Card
      title={(
        <span>
          <DatabaseOutlined style={{ marginRight: 8, color: '#2563EB' }} />
          知识库概览
        </span>
      )}
      bordered={false}
      style={{ borderRadius: 10, border: '1px solid #E2E8F0' }}
    >
      <List
        dataSource={knowledgeBaseSummaries}
        renderItem={(item) => (
          <List.Item style={{ padding: '10px 0' }}>
            <List.Item.Meta
              avatar={<Avatar icon={<DatabaseOutlined />} style={{ backgroundColor: '#0F172A' }} />}
              title={<Text style={{ fontSize: 14 }}>{item.name}</Text>}
              description={<Text type="secondary" style={{ fontSize: 12 }}>{item.docs} 份文档</Text>}
            />
            <Tag color={item.status === '就绪' ? 'green' : 'orange'}>{item.status}</Tag>
          </List.Item>
        )}
      />
    </Card>
  )
}
