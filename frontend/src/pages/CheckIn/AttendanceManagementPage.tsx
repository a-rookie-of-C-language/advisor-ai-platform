import { Tabs } from 'antd'
import {
  BarChartOutlined,
  ExceptionOutlined,
  TableOutlined,
} from '@ant-design/icons'
import AttendanceOverviewPage from './AttendanceOverviewPage'
import ExceptionHandlingPage from './ExceptionHandlingPage'
import CheckInManagementPage from '../Student/CheckInManagementPage'

export default function AttendanceManagementPage() {
  const items = [
    {
      key: 'overview',
      label: (
        <span>
          <BarChartOutlined />
          考勤总览
        </span>
      ),
      children: <AttendanceOverviewPage />,
    },
    {
      key: 'records',
      label: (
        <span>
          <TableOutlined />
          打卡记录
        </span>
      ),
      children: <CheckInManagementPage />,
    },
    {
      key: 'exceptions',
      label: (
        <span>
          <ExceptionOutlined />
          异常处理
        </span>
      ),
      children: <ExceptionHandlingPage />,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Tabs defaultActiveKey="overview" items={items} />
    </div>
  )
}
