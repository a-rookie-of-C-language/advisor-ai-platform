import { useState, type ChangeEvent } from 'react'
import { workspaceApi, type WorkspaceFileDTO } from '../../api/workspaceApi'
import { globalMessage } from '../../utils/globalMessage'
import type { ChatSession } from './chatTypes'

const MAX_PENDING_FILES = 10
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

export function usePendingChatFiles(activeSession: ChatSession | null) {
  const [pendingFiles, setPendingFiles] = useState<WorkspaceFileDTO[]>([])
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) {
      return
    }
    if (!activeSession) {
      globalMessage.warning('请先创建或选择会话后再上传附件')
      return
    }
    const availableSlots = Math.max(MAX_PENDING_FILES - pendingFiles.length, 0)
    if (availableSlots <= 0) {
      globalMessage.warning('最多只能同时附加 10 个文件')
      return
    }

    const selectedFiles = files.slice(0, availableSlots)
    const oversized = selectedFiles.find((file) => file.size > MAX_FILE_SIZE_BYTES)
    if (oversized) {
      globalMessage.error(`文件 ${oversized.name} 超过 20MB`)
      return
    }

    setUploading(true)
    try {
      const uploaded: WorkspaceFileDTO[] = []
      for (const file of selectedFiles) {
        const response = await workspaceApi.uploadFile(activeSession.id, file)
        if (response.data) {
          uploaded.push(response.data)
        }
      }
      setPendingFiles((prev) => [...prev, ...uploaded].slice(0, MAX_PENDING_FILES))
      if (uploaded.length > 0) {
        globalMessage.success(`已上传 ${uploaded.length} 个附件`)
      }
    } catch (error) {
      globalMessage.error(typeof error === 'string' ? error : '附件上传失败')
    } finally {
      setUploading(false)
    }
  }

  return {
    pendingFiles,
    uploading,
    handleFileSelect,
    clearPendingFiles: () => setPendingFiles([]),
    removePendingFile: (fileId: number) => {
      setPendingFiles((prev) => prev.filter((item) => item.id !== fileId))
    },
  }
}
