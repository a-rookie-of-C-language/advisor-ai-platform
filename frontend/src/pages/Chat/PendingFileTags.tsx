import { Space, Tag } from 'antd'
import { type WorkspaceFileDTO } from '../../api/workspaceApi'
import { formatFileSize, getFileIcon } from './chatFileDisplay'

interface PendingFileTagsProps {
  files: WorkspaceFileDTO[]
  sending: boolean
  onRemove: (fileId: number) => void
}

export function PendingFileTags({ files, sending, onRemove }: PendingFileTagsProps) {
  if (files.length === 0) {
    return null
  }

  return (
    <div style={{ marginTop: 8 }}>
      <Space wrap size={[6, 6]}>
        {files.map((file) => (
          <Tag
            key={file.id}
            closable={!sending}
            icon={getFileIcon(file.fileType)}
            onClose={() => onRemove(file.id)}
          >
            {file.fileName} 路 {formatFileSize(file.fileSize)}
          </Tag>
        ))}
      </Space>
    </div>
  )
}
