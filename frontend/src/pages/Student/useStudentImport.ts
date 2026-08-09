import { useState } from 'react'
import { studentImportApi, type ImportResultResponse } from '../../api/studentImportApi'
import { globalMessage } from '../../utils/globalMessage'

export function useStudentImport(onImported: () => void) {
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [overwrite, setOverwrite] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResultResponse | null>(null)

  const openImportModal = () => {
    setUploadModalVisible(true)
    setImportResult(null)
  }

  const closeImportModal = () => {
    setUploadModalVisible(false)
    setImportResult(null)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const response = await studentImportApi.upload(file, overwrite)
      if (response.code === 200) {
        setImportResult(response.data)
        globalMessage.success('导入完成')
        onImported()
      }
    } catch {
      globalMessage.error('导入失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  return {
    uploadModalVisible,
    overwrite,
    uploading,
    importResult,
    openImportModal,
    closeImportModal,
    setOverwrite,
    handleUpload,
  }
}
