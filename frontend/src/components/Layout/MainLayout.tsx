import { Layout } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import ChatSessionSidebar from './ChatSessionSidebar'
import MainHeader from './MainHeader'
import MainNavigation from './MainNavigation'
import { useMainLayoutChatSessions } from './useMainLayoutChatSessions'
import styles from './MainLayout.module.css'

const { Sider, Header, Content } = Layout

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { realName, logout, role } = useAuthStore()
  const chatSidebar = useMainLayoutChatSessions(
    location.pathname,
    location.search,
    navigate,
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} className={styles.sider}>
        <div className={styles.logo}>
          <span className={styles.logoText}>辅导员智库</span>
        </div>
        <MainNavigation role={role} selectedPath={location.pathname} onNavigate={navigate} />
        {chatSidebar.isChatPage && (
          <ChatSessionSidebar
            sessions={chatSidebar.chatSessions}
            activeSessionId={chatSidebar.activeSessionId}
            onCreate={chatSidebar.createSession}
            onSelect={chatSidebar.selectSession}
            onDelete={chatSidebar.deleteSession}
          />
        )}
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <MainHeader
            realName={realName}
            onLogout={() => {
              logout()
              navigate('/login')
            }}
          />
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
