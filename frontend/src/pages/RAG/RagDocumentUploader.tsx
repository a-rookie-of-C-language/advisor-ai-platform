import { Button, Card, Upload } from 'antd'
import { InboxOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload'

const { Dragger } = Upload

interface RagDocumentUploaderProps {
  fileList: UploadFile[]
  uploading: boolean
  onFileAccepted: (file: File, uploadFile: UploadFile) => void
  onFileRemoved: () => void
  onUpload: () => void
  onValidationError: (message: string) => void
}

export default function RagDocumentUploader({
  fileList,
  uploading,
  onFileAccepted,
  onFileRemoved,
  onUpload,
  onValidationError,
}: RagDocumentUploaderProps) {
  return (
    <Card bordered={false} style={{ marginBottom: 20, border: '1px solid #E2E8F0', borderRadius: 10 }}>
      <Dragger
        multiple={false}
        fileList={fileList}
        beforeUpload={(file) => {
          const allowed = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
          ]
          if (!allowed.includes(file.type)) {
            onValidationError('仅支持 PDF / DOCX / TXT 格式')
            return Upload.LIST_IGNORE
          }
          if (file.size > 50 * 1024 * 1024) {
            onValidationError('文件不能超过 50 MB')
            return Upload.LIST_IGNORE
          }
          onFileAccepted(file as File, file)
          return false
        }}
        onRemove={onFileRemoved}
        style={{ background: '#F8FAFC' }}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#2563EB', fontSize: 40 }} /></p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">支持 PDF、DOCX、TXT，单文件不超过 50 MB</p>
      </Dragger>
      {fileList.length > 0 && (
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Button type="primary" icon={<UploadOutlined />} loading={uploading} onClick={onUpload}>
            开始上传
          </Button>
        </div>
      )}
    </Card>
  )
}
