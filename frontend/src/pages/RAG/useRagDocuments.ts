import { useCallback, useEffect, useState } from 'react'
import type { UploadFile } from 'antd/es/upload'
import { ragApi, type RagDocumentDTO } from '../../api/ragApi'
import { getErrorMessage } from './RagDisplay'

interface RagDocumentMessageApi {
  error: (content: string) => void
  success: (content: string) => void
  warning: (content: string) => void
}

interface UseRagDocumentsParams {
  kbId: number
  messageApi: RagDocumentMessageApi
  onChanged: () => Promise<void>
}

export function useRagDocuments({ kbId, messageApi, onChanged }: UseRagDocumentsParams) {
  const [docs, setDocs] = useState<RagDocumentDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ragApi.listDocuments(kbId)
      setDocs(res.data)
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [kbId, messageApi])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const refreshDocumentsAndKnowledgeBase = useCallback(async () => {
    await Promise.all([loadDocuments(), onChanged()])
  }, [loadDocuments, onChanged])

  const deleteDocument = async (id: number) => {
    try {
      await ragApi.deleteDocument(id)
      messageApi.success('文档已删除')
      await refreshDocumentsAndKnowledgeBase()
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    }
  }

  const uploadDocument = async () => {
    if (!selectedFile) {
      messageApi.warning('请先选择文件')
      return
    }

    setUploading(true)
    try {
      await ragApi.uploadDocument(kbId, selectedFile)
      messageApi.success('文件上传成功，正在索引中')
      setFileList([])
      setSelectedFile(null)
      await refreshDocumentsAndKnowledgeBase()
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    } finally {
      setUploading(false)
    }
  }

  const acceptFile = (file: File, uploadFile: UploadFile) => {
    setSelectedFile(file)
    setFileList([uploadFile])
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFileList([])
  }

  return {
    docs,
    loading,
    uploading,
    fileList,
    loadDocuments,
    deleteDocument,
    uploadDocument,
    acceptFile,
    removeFile,
  }
}
