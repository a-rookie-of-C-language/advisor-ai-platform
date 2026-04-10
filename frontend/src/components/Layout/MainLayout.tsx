import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  SearchOutlined,
  BulbOutlined,
  BookOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import styles from './MainLayout.module.css'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/policy', icon: <FileTextOutlined />, label: '政策解读' },
  { key: '/case', icon: <SearchOutlined />, label: '案例检索' },
  { key: '/method', icon: <BulbOutlined />, label: '方法推荐' },
  { key: '/training', icon: <BookOutlined />, label: '培训支持' },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { realName, logout } = useAuthStore()

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
