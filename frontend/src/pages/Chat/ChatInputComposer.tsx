import { type ChangeEvent } from 'react'
import { Button, Input, Typography } from 'antd'
import {
  LoadingOutlined,
  PaperClipOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { type WorkspaceFileDTO } from '../../api/workspaceApi'
import { PendingFileTags } from './PendingFileTags'
import styles from './ChatPage.module.css'

const { Text } = Typography

interface ChatInputComposerProps {
  fileInputRef: { current: HTMLInputElement | null }
  inputText: string
  pendingFiles: WorkspaceFileDTO[]
  uploading: boolean
  sending: boolean
  canUpload: boolean
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void
  onInputChange: (value: string) => void
  onSend: () => void
  onRemoveFile: (fileId: number) => void
}

export function ChatInputComposer({
  fileInputRef,
  inputText,
  pendingFiles,
  uploading,
  sending,
  canUpload,
  onFileSelect,
  onInputChange,
  onSend,
  onRemoveFile,
}: ChatInputComposerProps) {
  return (
    <div className={styles.inputArea}>
      <div className={styles.inputRow}>
        <input
          ref={(node) => {
            fileInputRef.current = node
          }}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.docx,.md,.txt"
          style={{ display: 'none' }}
          onChange={(event) => onFileSelect(event)}
        />
        <Button
          icon={<PaperClipOutlined />}
          disabled={sending || uploading || !canUpload}
          loading={uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{ height: 40, borderRadius: 8 }}
        />

        <Input.TextArea
          value={inputText}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="输入问题，按 Ctrl+Enter 发送"
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={sending}
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === 'Enter') {
              onSend()
            }
          }}
          style={{ borderRadius: 8, resize: 'none', flex: 1 }}
        />

        <Button
          type="primary"
          icon={sending ? <LoadingOutlined /> : <SendOutlined />}
          disabled={(!inputText.trim() && pendingFiles.length === 0) || sending}
          onClick={onSend}
          style={{ height: 40, paddingInline: 20, borderRadius: 8 }}
        >
          发送
        </Button>
      </div>

      <PendingFileTags files={pendingFiles} sending={sending} onRemove={onRemoveFile} />

      <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block', textAlign: 'center' }}>
        AI 回答仅供参考，请结合实际情况进行判断。支持上传图片/PDF/Word/Markdown（单文件20MB，最多10个）
      </Text>
    </div>
  )
}
