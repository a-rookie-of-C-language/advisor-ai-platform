import { Button, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckCircleOutlined } from '@ant-design/icons'
import type { AvailableCheckInActivityVO, CheckInRecordVO } from '../../api/checkInApi'

export const checkInRecordColumns: ColumnsType<CheckInRecordVO> = [
  { title: '打卡ID', dataIndex: 'checkInId', key: 'checkInId', width: 220 },
  { title: '活动', dataIndex: 'activityTitle', key: 'activityTitle', width: 180 },
  { title: '班级', dataIndex: 'classCode', key: 'classCode', width: 120 },
  { title: '日期', dataIndex: 'checkDate', key: 'checkDate', width: 140 },
  {
    title: '状态',
    dataIndex: 'checkedIn',
    key: 'checkedIn',
    width: 100,
    render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? '已打卡' : '未打卡'}</Tag>,
  },
  { title: '打卡时间', dataIndex: 'checkTime', key: 'checkTime', width: 180 },
]

export function createActivityColumns(
  onCheckIn: (checkInId: string) => void,
): ColumnsType<AvailableCheckInActivityVO> {
  return [
    { title: '课程', dataIndex: 'courseName', key: 'courseName', width: 160 },
    { title: '活动', dataIndex: 'title', key: 'title', width: 180 },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime', width: 180 },
    { title: '结束时间', dataIndex: 'endTime', key: 'endTime', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record) => (
        <Button
          type="primary"
          size="small"
          icon={<CheckCircleOutlined />}
          disabled={record.checkedIn}
          onClick={() => onCheckIn(record.checkInId)}
        >
          {record.checkedIn ? '已打卡' : '打卡'}
        </Button>
      ),
    },
  ]
}
