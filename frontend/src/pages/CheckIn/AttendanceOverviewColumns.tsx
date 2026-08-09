import type { TableColumnsType } from 'antd'
import type { ClassAttendanceStatistics } from '../../api/checkInApi'

export function buildAttendanceClassColumns(): TableColumnsType<ClassAttendanceStatistics> {
  return [
    {
      title: '班级',
      dataIndex: 'className',
      key: 'className',
    },
    {
      title: '总记录',
      dataIndex: 'totalRecords',
      key: 'totalRecords',
    },
    {
      title: '正常',
      dataIndex: 'normalCount',
      key: 'normalCount',
      render: (value: number) => <span style={{ color: '#52c41a' }}>{value}</span>,
    },
    {
      title: '迟到',
      dataIndex: 'lateCount',
      key: 'lateCount',
      render: (value: number) => <span style={{ color: '#faad14' }}>{value}</span>,
    },
    {
      title: '缺勤',
      dataIndex: 'absentCount',
      key: 'absentCount',
      render: (value: number) => <span style={{ color: '#ff4d4f' }}>{value}</span>,
    },
    {
      title: '出勤率',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      render: (value: number) => `${value}%`,
    },
  ]
}
