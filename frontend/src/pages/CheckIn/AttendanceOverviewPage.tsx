import { Card, DatePicker, Space, Table } from 'antd'
import { useMemo } from 'react'
import { buildAttendanceClassColumns } from './AttendanceOverviewColumns'
import AttendanceSummaryCards from './AttendanceSummaryCards'
import { useAttendanceOverview } from './useAttendanceOverview'

const { RangePicker } = DatePicker

export default function AttendanceOverviewPage() {
  const { loading, statistics, classStatistics, dateRange, setDateRange } =
    useAttendanceOverview()
  const classColumns = useMemo(() => buildAttendanceClassColumns(), [])

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([dates[0], dates[1]])
            }
          }}
        />
      </Space>

      <AttendanceSummaryCards statistics={statistics} />

      <Card title="班级考勤统计" loading={loading}>
        <Table
          columns={classColumns}
          dataSource={classStatistics}
          rowKey="classCode"
          pagination={false}
        />
      </Card>
    </div>
  )
}
