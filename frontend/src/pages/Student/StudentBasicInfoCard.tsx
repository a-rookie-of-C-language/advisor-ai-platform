import { Card, Descriptions } from 'antd'
import type { StudentDetailResponse } from '../../api/studentApi'

interface StudentBasicInfoCardProps {
  loading: boolean
  student: StudentDetailResponse | null
}

export default function StudentBasicInfoCard({
  loading,
  student,
}: StudentBasicInfoCardProps) {
  return (
    <Card title="学生基本信息" loading={loading} style={{ marginBottom: 16 }}>
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="学号">{student?.studentNo || '-'}</Descriptions.Item>
        <Descriptions.Item label="姓名">{student?.name || '-'}</Descriptions.Item>
        <Descriptions.Item label="性别">{student?.genderText || '-'}</Descriptions.Item>
        <Descriptions.Item label="年级">{student?.grade || '-'}</Descriptions.Item>
        <Descriptions.Item label="专业">{student?.major || '-'}</Descriptions.Item>
        <Descriptions.Item label="班级">{student?.classCode || '-'}</Descriptions.Item>
        <Descriptions.Item label="辅导员">{student?.counselorNo || '-'}</Descriptions.Item>
        <Descriptions.Item label="手机号">{student?.phone || '-'}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{student?.email || '-'}</Descriptions.Item>
        <Descriptions.Item label="宿舍">{student?.dormitory || '-'}</Descriptions.Item>
        <Descriptions.Item label="紧急联系人">{student?.emergencyContact || '-'}</Descriptions.Item>
        <Descriptions.Item label="信息完整度">
          {student?.infoCompletenessText || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="风险等级">{student?.riskLevelText || '-'}</Descriptions.Item>
      </Descriptions>
    </Card>
  )
}
