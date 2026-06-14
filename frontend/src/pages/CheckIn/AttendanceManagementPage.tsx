import { Tabs } from 'antd'
import {
  BarChartOutlined,
  CalendarOutlined,
  ExceptionOutlined,
  FileExcelOutlined,
  FormOutlined,
  TableOutlined,
} from '@ant-design/icons'
import AttendanceOverviewPage from './AttendanceOverviewPage'
import ExceptionHandlingPage from './ExceptionHandlingPage'
import CheckInManagementPage from '../Student/CheckInManagementPage'
import ClassAttendancePage from './ClassAttendancePage'
import CourseScheduleImportPage from './CourseScheduleImportPage'
import AttendanceWorkOrderPage from './AttendanceWorkOrderPage'
import { useAuthStore } from '../../store/authStore'

export default function AttendanceManagementPage() {
  const role = useAuthStore((state) => state.role)
  const managerItems = [
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
      key: 'schedule',
      label: (
        <span>
          <FileExcelOutlined />
          课表导入
        </span>
      ),
      children: <CourseScheduleImportPage />,
    },
    {
      key: 'session-attendance',
      label: (
        <span>
          <CalendarOutlined />
          课堂考勤
        </span>
      ),
      children: <ClassAttendancePage />,
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
      key: 'work-orders',
      label: (
        <span>
          <FormOutlined />
          工单
        </span>
      ),
      children: <AttendanceWorkOrderPage />,
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
  const monitorItems = [
    {
      key: 'session-attendance',
      label: (
        <span>
          <CalendarOutlined />
          课堂考勤
        </span>
      ),
      children: <ClassAttendancePage />,
    },
    {
      key: 'work-orders',
      label: (
        <span>
          <FormOutlined />
          工单
        </span>
      ),
      children: <AttendanceWorkOrderPage />,
    },
  ]
  const items = role === 'MONITOR' ? monitorItems : managerItems

  return (
    <div style={{ padding: 24 }}>
      <Tabs defaultActiveKey="overview" items={items} />
    </div>
  )
}
