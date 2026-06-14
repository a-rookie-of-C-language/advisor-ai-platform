import { InboxOutlined } from '@ant-design/icons'
import { Alert, Card, Upload } from 'antd'
import type { UploadProps } from 'antd'
import { attendanceApi } from '../../api/attendanceApi'
import { globalMessage } from '../../utils/globalMessage'

export default function CourseScheduleImportPage() {
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls',
    showUploadList: false,
    customRequest: async ({ file, onError, onSuccess }) => {
      try {
        const response = await attendanceApi.importSchedules(file as File)
        if (response.code === 200) {
          globalMessage.success(
            `导入 ${response.data.scheduleCount} 条课表，生成 ${response.data.sessionCount} 节课堂`,
          )
          onSuccess?.(response)
        }
      } catch (error) {
        globalMessage.error('课表导入失败')
        onError?.(error as Error)
      }
    },
  }

  return (
    <div style={{ padding: 24 }}>
      <Card title="学期课表导入">
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Excel 字段：学期、班级、课程编号、课程名称、教师工号、教师姓名、周次范围、星期、节次、地点"
        />
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 Excel 文件到此区域</p>
        </Upload.Dragger>
      </Card>
    </div>
  )
}
