import { Menu } from 'antd'
import {
  AuditOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  MessageOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import styles from './MainLayout.module.css'

interface MainNavigationProps {
  role?: string | null
  selectedPath: string
  onNavigate: (path: string) => void
}

export default function MainNavigation({ role, selectedPath, onNavigate }: MainNavigationProps) {
  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/student', icon: <TeamOutlined />, label: '学生管理' },
    { key: '/student/check-in', icon: <CheckCircleOutlined />, label: '打卡管理' },
    { key: '/rag', icon: <DatabaseOutlined />, label: '知识库管理' },
    { key: '/chat', icon: <MessageOutlined />, label: 'AI 对话' },
    ...(role === 'ADMIN'
      ? [
          { key: '/audit', icon: <AuditOutlined />, label: '审计日志' },
          { key: '/monitor', icon: <LineChartOutlined />, label: '监控中心' },
        ]
      : []),
  ]

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedPath]}
      items={menuItems}
      onClick={({ key }) => onNavigate(key)}
      className={styles.menu}
    />
  )
}
