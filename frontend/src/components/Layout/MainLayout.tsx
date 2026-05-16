import { useEffect, useMemo, useRef, useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  DatabaseOutlined,
  MessageOutlined,
  AuditOutlined,
  LineChartOutlined,
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  FileTextOutlined,
  UploadOutlined,
  PieChartOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { chatApi, type ChatSessionDTO } from '../../api/chatApi'
import { globalMessage } from '../../utils/globalMessage'
import ChatSessionSidebar from './ChatSessionSidebar'
import { onChatSessionsRefresh } from '../../pages/Chat/chatSessionEvents'
import styles from './MainLayout.module.css'

const { Sider, Header, Content } = Layout

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { realName, logout, role } = useAuthStore()
  const [chatSessions, setChatSessions] = useState<ChatSessionDTO[]>([])
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadSeqRef = useRef(0)
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
    const currentSeq = ++loadSeqRef.current
    try {
      const response = await chatApi.listSessions()
      if (currentSeq !== loadSeqRef.current) {
        return
      }
      setChatSessions(response.data ?? [])
    } catch {
      if (currentSeq !== loadSeqRef.current) {
        return
      }
      setChatSessions([])
    }
  }

  useEffect(() => {
    void loadChatSessions()
  }, [location.pathname, location.search])

  useEffect(() => {
    const unsubscribe = onChatSessionsRefresh(() => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null
        void loadChatSessions()
      }, 80)
    })
    return () => {
      unsubscribe()
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [location.pathname, location.search])

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/student', icon: <TeamOutlined />, label: '学生管理' },
    { key: '/student/check-in', icon: <CheckCircleOutlined />, label: '打卡管理' },
    { key: '/student/task', icon: <FileTextOutlined />, label: '任务管理' },
    { key: '/student/import', icon: <UploadOutlined />, label: '导入管理' },
    { key: '/student/stat', icon: <PieChartOutlined />, label: '数据统计' },
    { key: '/rag', icon: <DatabaseOutlined />, label: '知识库管理' },
    { key: '/chat', icon: <MessageOutlined />, label: 'AI 对话' },
    ...(role === 'ADMIN'
      ? [
          { key: '/audit', icon: <AuditOutlined />, label: '审计日志' },
          { key: '/monitor', icon: <LineChartOutlined />, label: '监控中心' },
        ]
      : []),
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
                try {
                  const created = (await chatApi.createSession()).data
                  if (!created?.id) {
                    globalMessage.error('创建会话失败')
                    return
                  }
                  navigate(`/chat?sessionId=${created.id}`)
                  await loadChatSessions()
                } catch (error) {
                  globalMessage.error(typeof error === 'string' ? error : '创建会话失败')
                }
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
