import { Card, Typography } from 'antd'

const { Paragraph } = Typography

export default function DashboardIntroCard() {
  return (
    <Card
      title="平台介绍"
      bordered={false}
      style={{ borderRadius: 10, border: '1px solid #E2E8F0' }}
    >
      <Paragraph>
        <strong>辅导员智库</strong>是以"智小理"AI大脑为核心，融合知识库（RAG）技术构建的智能支持平台。
        平台聚焦<strong>知识库管理与 AI 对话</strong>两大核心功能，
        打造具有"红岩思政"和兵工特色的智能支持体系，持续提升辅导员专业化、智能化水平。
      </Paragraph>
    </Card>
  )
}
