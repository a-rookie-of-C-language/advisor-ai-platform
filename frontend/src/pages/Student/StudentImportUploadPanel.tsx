import { InboxOutlined } from '@ant-design/icons'
import { Radio, Upload } from 'antd'

const { Dragger } = Upload

interface StudentImportUploadPanelProps {
  overwrite: boolean
  uploading: boolean
  onOverwriteChange: (overwrite: boolean) => void
  onUpload: (file: File) => Promise<boolean>
}

export function StudentImportUploadPanel({
  overwrite,
  uploading,
  onOverwriteChange,
  onUpload,
}: StudentImportUploadPanelProps) {
  return (
    <>
      <Dragger
        accept=".xlsx,.xls"
        showUploadList={false}
        beforeUpload={onUpload}
        disabled={uploading}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">支持 .xlsx 和 .xls 格式的 Excel 文件</p>
      </Dragger>

      <div style={{ marginTop: 16 }}>
        <Radio.Group
          value={overwrite}
          onChange={(event) => onOverwriteChange(event.target.value)}
        >
          <Radio value={true}>覆盖已有数据</Radio>
          <Radio value={false}>保留已有数据（跳过重复）</Radio>
        </Radio.Group>
      </div>
    </>
  )
}
