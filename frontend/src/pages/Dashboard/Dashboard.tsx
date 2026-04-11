import { Card, Row, Col, Statistic, Typography, List, Tag, Avatar } from 'antd'
import {
  DatabaseOutlined,
  FileTextOutlined,
  MessageOutlined,
  RobotOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'

const { Title, Paragraph, Text } = Typography

const stats = [
  { title: '知识库数量', value: 3, icon: <DatabaseOutlined style={{ fontSize: 28, color: '#2563EB' }} />, color: '#EFF6FF', suffix: '个' },
  { title: '文档总数', value: 42, icon: <FileTextOutlined style={{ fontSize: 28, color: '#0369A1' }} />, color: '#F0F9FF', suffix: '份' },
  { title: '累计对话', value: 128, icon: <MessageOutlined style={{ fontSize: 28, color: '#7C3AED' }} />, color: '#F5F3FF', suffix: '次' },
  { title: '今日提问', value: 6, icon: <RobotOutlined style={{ fontSize: 28, color: '#059669' }} />, color: '#ECFDF5', suffix: '次' },
]

const recentChats = [
  { id: 1, title: '如何处理学生心理危机事件？', time: '10分钟前', tag: '心理健康' },
  { id: 2, title: '课程思政元素融入方法？', time: '1小时前', tag: '课程思政' },
  { id: 3, title: '辅导员职业发展路径规划', time: '昨天', tag: '职业发展' },
]

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

      <Row gutter={[16, 16]}>
        {stats.map((s) => (
          <Col xs={24} sm={12} lg={6} key={s.title}>
            <Card style={{ background: s.color, border: 'none', borderRadius: 10, transition: 'box-shadow 200ms ease' }}
              styles={{ body: { padding: '20px 24px' } }}
              hoverable>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 10, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  {s.icon}
                </div>
                <Statistic title={s.title} value={s.value} suffix={s.suffix} valueStyle={{ fontSize: 24, fontWeight: 600 }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title={<span><MessageOutlined style={{ marginRight: 8, color: '#2563EB' }} />最近对话</span>}
            bordered={false} style={{ borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <List
              dataSource={recentChats}
              renderItem={(item) => (
                <List.Item style={{ padding: '10px 0', cursor: 'pointer' }}>
                  <List.Item.Meta
                    avatar={<Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#2563EB' }} />}
                    title={<Text style={{ fontSize: 14 }}>{item.title}</Text>}
                    description={
                      <span>
                        <Tag color="blue" style={{ fontSize: 11 }}>{item.tag}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />{item.time}
                        </Text>
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span><DatabaseOutlined style={{ marginRight: 8, color: '#2563EB' }} />知识库概览</span>}
            bordered={false} style={{ borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <List
              dataSource={[
                { name: '思政教育资料库', docs: 18, status: '就绪' },
                { name: '学生工作政策库', docs: 14, status: '就绪' },
                { name: '心理健康指导库', docs: 10, status: '索引中' },
              ]}
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
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="平台介绍" bordered={false} style={{ borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <Paragraph>
              <strong>辅导员智库</strong>是以"智小理"AI大脑为核心，融合知识库（RAG）技术构建的智能支持平台。
              平台聚焦<strong>知识库管理与 AI 对话</strong>两大核心功能，
              打造具有"红岩思政"和兵工特色的智能支持体系，持续提升辅导员专业化、智能化水平。
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
