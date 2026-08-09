import { Card, Table } from 'antd'
import type { StudentCheckInDetailResponse } from '../../api/studentApi'
import { studentCheckInRecordColumns } from './studentCheckInColumns'

interface StudentRecentCheckInCardProps {
  loading: boolean
  detail: StudentCheckInDetailResponse | null
}

export default function StudentRecentCheckInCard({
  loading,
  detail,
}: StudentRecentCheckInCardProps) {
  return (
    <Card title="最近打卡记录" loading={loading}>
      <Table
        columns={studentCheckInRecordColumns}
        dataSource={detail?.recentRecords || []}
        rowKey={(record) => `${record.checkDate}-${record.checkTime || 'none'}`}
        pagination={false}
      />
    </Card>
  )
}
