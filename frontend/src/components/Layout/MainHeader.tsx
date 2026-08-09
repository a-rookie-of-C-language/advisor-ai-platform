import { Avatar, Dropdown, Space, Typography } from 'antd'
import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import styles from './MainLayout.module.css'

interface MainHeaderProps {
  realName?: string | null
  onLogout: () => void
}

export default function MainHeader({ realName, onLogout }: MainHeaderProps) {
  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: onLogout,
      },
    ],
  }

  return (
    <>
      <Typography.Text className={styles.headerTitle}>
        重庆理工大学 · 辅导员智能支持平台
      </Typography.Text>
      <Dropdown menu={userMenu} placement="bottomRight">
        <Space className={styles.userInfo} style={{ cursor: 'pointer' }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#0369A1' }} />
          <span>{realName}</span>
        </Space>
      </Dropdown>
    </>
  )
}
