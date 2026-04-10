import { Card, Row, Col, Statistic, Typography } from 'antd'
import {
  FileTextOutlined,
  SearchOutlined,
  BulbOutlined,
  BookOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'

const { Title, Paragraph } = Typography

const stats = [
  { title: '政策文件', value: 0, icon: <FileTextOutlined style={{ fontSize: 32, color: '#8B1A1A' }} />, color: '#fff0f0' },
  { title: '典型案例', value: 0, icon: <SearchOutlined style={{ fontSize: 32, color: '#d46b08' }} />, color: '#fff7e6' },
  { title: '工作方法', value: 0, icon: <BulbOutlined style={{ fontSize: 32, color: '#096dd9' }} />, color: '#e6f4ff' },
  { title: '培训资源', value: 0, icon: <BookOutlined style={{ fontSize: 32, color: '#389e0d' }} />, color: '#f6ffed' },
]

export default function Dashboard() {
  const realName = useAuthStore((s) => s.realName)

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>
        欢迎回来，{realName}
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        辅导员智库 · 红岩思政 · 兵工特色智能支持平台
      </Paragraph>

      <Row gutter={[16, 16]}>
        {stats.map((s) => (
          <Col xs={24} sm={12} lg={6} key={s.title}>
            <Card style={{ background: s.color, border: 'none', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {s.icon}
                <Statistic title={s.title} value={s.value} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="平台介绍" bordered={false}>
            <Paragraph>
              <strong>辅导员智库</strong>是以"智小理"AI大脑、课程思政智库、红色文化育人和人工智能学院为基础建设的智能体平台。
              平台聚焦<strong>政策解读、案例检索、方法推荐和培训支持</strong>四大核心功能，
              打造具有"红岩思政"和兵工特色的智能支持体系，持续提升辅导员专业化、智能化水平。
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
