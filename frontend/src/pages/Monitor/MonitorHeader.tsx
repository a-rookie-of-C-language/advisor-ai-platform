import { Tag, Typography } from 'antd'
import styles from './MonitorPage.module.css'

const { Title } = Typography

interface MonitorHeaderProps {
  connected: boolean
  generatedAtText: string
  refreshSeconds?: number
}

export function MonitorHeader({ connected, generatedAtText, refreshSeconds }: MonitorHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <Title level={4} style={{ marginBottom: 2 }}>
          监控中心（实时）
        </Title>
        <div className={styles.meta}>
          {connected ? (
            <Tag color="green">已连接</Tag>
          ) : (
            <Tag color="red">未连接</Tag>
          )}
          最近刷新：{generatedAtText} · 推送间隔：{refreshSeconds ?? 10}s
        </div>
      </div>
    </div>
  )
}
