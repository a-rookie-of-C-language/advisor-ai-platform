import { Tag } from 'antd'

type TagConfig = {
  color: string
  text: string
}

const exceptionStatusMap: Record<string, TagConfig> = {
  PENDING: { color: 'orange', text: '待处理' },
  PROCESSING: { color: 'blue', text: '处理中' },
  COMPLETED: { color: 'green', text: '已完成' },
  CLOSED: { color: 'default', text: '已关闭' },
}

const exceptionTypeMap: Record<string, TagConfig> = {
  LATE: { color: 'orange', text: '迟到' },
  ABSENT: { color: 'red', text: '缺勤' },
  LEAVE_EARLY: { color: 'orange', text: '早退' },
}

export function renderExceptionStatusTag(status: string) {
  const config = exceptionStatusMap[status] || { color: 'default', text: status }
  return <Tag color={config.color}>{config.text}</Tag>
}

export function renderExceptionTypeTag(type: string) {
  const config = exceptionTypeMap[type] || { color: 'default', text: type }
  return <Tag color={config.color}>{config.text}</Tag>
}
