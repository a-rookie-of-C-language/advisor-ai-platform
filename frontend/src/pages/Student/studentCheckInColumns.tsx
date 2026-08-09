import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { StudentCheckInDetailResponse } from '../../api/studentApi'

type CheckInRecord = StudentCheckInDetailResponse['recentRecords'][number]

export const studentCheckInRecordColumns: ColumnsType<CheckInRecord> = [
  {
    title: '日期',
    dataIndex: 'checkDate',
    key: 'checkDate',
    width: 140,
  },
  {
    title: '状态',
    dataIndex: 'checkedIn',
    key: 'checkedIn',
    width: 100,
    render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? '已打卡' : '未打卡'}</Tag>,
  },
  {
    title: '打卡时间',
    dataIndex: 'checkTime',
    key: 'checkTime',
    width: 180,
    render: (value?: string) => value || '-',
  },
]
