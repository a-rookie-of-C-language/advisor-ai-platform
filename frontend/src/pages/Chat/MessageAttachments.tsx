import { Space, Tag } from 'antd'
import type { ChatMessage } from './chatMessageModel'
import { getFileIcon } from './chatFileDisplay'

interface MessageAttachmentsProps {
  msg: ChatMessage
}

export function MessageAttachments({ msg }: MessageAttachmentsProps) {
  if (!msg.attachments?.length) {
    return null
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <Space wrap size={[4, 4]}>
        {msg.attachments.map((file) => (
          <Tag key={file.id} icon={getFileIcon(file.fileType)} color="default" style={{ fontSize: 11 }}>
            {file.fileName}
          </Tag>
        ))}
      </Space>
    </div>
  )
}
