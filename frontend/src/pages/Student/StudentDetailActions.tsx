import { Button, Space } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons'

interface StudentDetailActionsProps {
  onBack: () => void
  onCheckInManagement: () => void
}

export default function StudentDetailActions({
  onBack,
  onCheckInManagement,
}: StudentDetailActionsProps) {
  return (
    <Space style={{ marginBottom: 16 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
        返回学生管理
      </Button>
      <Button icon={<CheckCircleOutlined />} onClick={onCheckInManagement}>
        打卡管理
      </Button>
    </Space>
  )
}
