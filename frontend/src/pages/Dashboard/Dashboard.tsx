import { Col, Row, Typography } from 'antd'
import { useAuthStore } from '../../store/authStore'
import DashboardIntroCard from './DashboardIntroCard'
import DashboardKnowledgeBaseCard from './DashboardKnowledgeBaseCard'
import DashboardRecentChatsCard from './DashboardRecentChatsCard'
import DashboardStatsGrid from './DashboardStatsGrid'

const { Title, Paragraph } = Typography

export default function Dashboard() {
  const realName = useAuthStore((s) => s.realName)

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>
        欢迎回来，{realName}
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        辅导员智库 · 红岩思政 · 兵工特色 · AI 智能支持平台
      </Paragraph>

      <DashboardStatsGrid />

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <DashboardRecentChatsCard />
        </Col>
        <Col xs={24} lg={12}>
          <DashboardKnowledgeBaseCard />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <DashboardIntroCard />
        </Col>
      </Row>
    </div>
  )
}
