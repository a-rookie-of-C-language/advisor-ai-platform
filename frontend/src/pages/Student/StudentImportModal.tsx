import { Modal } from 'antd'
import type { ImportResultResponse } from '../../api/studentImportApi'
import { StudentImportResultCard } from './StudentImportResultCard'
import { StudentImportUploadPanel } from './StudentImportUploadPanel'

type StudentImportModalProps = {
  open: boolean
  overwrite: boolean
  uploading: boolean
  importResult: ImportResultResponse | null
  onCancel: () => void
  onOverwriteChange: (overwrite: boolean) => void
  onUpload: (file: File) => Promise<boolean>
}

export function StudentImportModal({
  open,
  overwrite,
  uploading,
  importResult,
  onCancel,
  onOverwriteChange,
  onUpload,
}: StudentImportModalProps) {
  return (
    <Modal
      title="导入学生信息"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ padding: '24px 0' }}>
        <StudentImportUploadPanel
          overwrite={overwrite}
          uploading={uploading}
          onOverwriteChange={onOverwriteChange}
          onUpload={onUpload}
        />

        {importResult && <StudentImportResultCard importResult={importResult} />}
      </div>
    </Modal>
  )
}
