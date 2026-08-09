import { Tag } from 'antd'
import styles from './MonitorPage.module.css'

export function statusClass(status: string) {
  if (status === 'critical') return styles.critical
  if (status === 'warn') return styles.warn
  return styles.ok
}

export function statusTag(status: string) {
  if (status === 'critical') return <Tag color="red">严重</Tag>
  if (status === 'warn') return <Tag color="gold">告警</Tag>
  return <Tag color="green">正常</Tag>
}
