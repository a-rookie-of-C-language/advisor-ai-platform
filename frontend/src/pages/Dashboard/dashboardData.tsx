import {
  DatabaseOutlined,
  FileTextOutlined,
  MessageOutlined,
  RobotOutlined,
} from '@ant-design/icons'

export const dashboardStats = [
  {
    title: '知识库数量',
    value: 3,
    icon: <DatabaseOutlined style={{ fontSize: 28, color: '#2563EB' }} />,
    color: '#EFF6FF',
    suffix: '个',
  },
  {
    title: '文档总数',
    value: 42,
    icon: <FileTextOutlined style={{ fontSize: 28, color: '#0369A1' }} />,
    color: '#F0F9FF',
    suffix: '份',
  },
  {
    title: '累计对话',
    value: 128,
    icon: <MessageOutlined style={{ fontSize: 28, color: '#7C3AED' }} />,
    color: '#F5F3FF',
    suffix: '次',
  },
  {
    title: '今日提问',
    value: 6,
    icon: <RobotOutlined style={{ fontSize: 28, color: '#059669' }} />,
    color: '#ECFDF5',
    suffix: '次',
  },
]

export const recentChats = [
  { id: 1, title: '如何处理学生心理危机事件？', time: '10分钟前', tag: '心理健康' },
  { id: 2, title: '课程思政元素融入方法？', time: '1小时前', tag: '课程思政' },
  { id: 3, title: '辅导员职业发展路径规划', time: '昨天', tag: '职业发展' },
]

export const knowledgeBaseSummaries = [
  { name: '思政教育资料库', docs: 18, status: '就绪' },
  { name: '学生工作政策库', docs: 14, status: '就绪' },
  { name: '心理健康指导库', docs: 10, status: '索引中' },
]
