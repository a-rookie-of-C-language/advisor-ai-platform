import { useEffect, useMemo, useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  DatabaseOutlined,
  MessageOutlined,
  AuditOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { chatApi, type ChatSessionDTO } from '../../api/chatApi'
import ChatSessionSidebar from './ChatSessionSidebar'
import styles from './MainLayout.module.css'

const { Sider, Header, Content } = Layout

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { realName, logout, role } = useAuthStore()
  const [chatSessions, setChatSessions] = useState<ChatSessionDTO[]>([])
  const isChatPage = location.pathname === '/chat'
  const activeSessionId = useMemo(() => {
    const value = new URLSearchParams(location.search).get('sessionId')
    if (!value) {
      return null
    }
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }, [location.search])

  const loadChatSessions = async () => {
    if (!isChatPage) {
      return
    }
    try {
      const response = await chatApi.listSessions()
      setChatSessions(response.data ?? [])
    } catch {
      setChatSessions([])
    }
  }

  useEffect(() => {
    void loadChatSessions()
    if (!isChatPage) {
      return
    }
    const timer = setInterval(() => {
      void loadChatSessions()
    }, 5000)
    return () => clearInterval(timer)
  }, [location.pathname])

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/rag', icon: <DatabaseOutlined />, label: '知识库管理' },
    { key: '/chat', icon: <MessageOutlined />, label: 'AI 对话' },
    ...(role === 'ADMIN' ? [{ key: '/audit', icon: <AuditOutlined />, label: '审计日志' }] : []),
  ]

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: () => {
          logout()
          navigate('/login')
        },
      },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} className={styles.sider}>
        <div className={styles.logo}>
          <span className={styles.logoText}>辅导员智库</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className={styles.menu}
        />
        {isChatPage && (
          <ChatSessionSidebar
            sessions={chatSessions}
            activeSessionId={activeSessionId}
            onCreate={() => {
              void (async () => {
                const created = (await chatApi.createSession()).data
                navigate(`/chat?sessionId=${created.id}`)
                await loadChatSessions()
              })()
            }}
            onSelect={(sessionId) => navigate(`/chat?sessionId=${sessionId}`)}
            onDelete={(sessionId) => {
              void (async () => {
                await chatApi.deleteSession(sessionId)
                const next = chatSessions.filter((s) => s.id !== sessionId)
                setChatSessions(next)
                if (activeSessionId === sessionId) {
                  navigate(next.length > 0 ? `/chat?sessionId=${next[0].id}` : '/chat')
                }
              })()
            }}
          />
        )}
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <Typography.Text className={styles.headerTitle}>
            重庆理工大学 · 辅导员智能支持平台
          </Typography.Text>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space className={styles.userInfo} style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#0369A1' }} />
              <span>{realName}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
