import { useCallback, useEffect, useState } from 'react'
import { message } from 'antd'
import { checkInApi, type CheckInException } from '../../api/checkInApi'
import { globalMessage } from '../../utils/globalMessage'

export function useCheckInExceptions() {
  const [loading, setLoading] = useState(false)
  const [exceptions, setExceptions] = useState<CheckInException[]>([])
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [modalVisible, setModalVisible] = useState(false)
  const [currentException, setCurrentException] = useState<CheckInException | null>(null)
  const [handlerNote, setHandlerNote] = useState('')
  const [targetStatus, setTargetStatus] = useState('')

  const resetModal = useCallback(() => {
    setModalVisible(false)
    setHandlerNote('')
    setTargetStatus('')
    setCurrentException(null)
  }, [])

  const loadExceptions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await checkInApi.listExceptions({
        status: statusFilter,
      })
      if (response.code === 200) {
        setExceptions(response.data || [])
      }
    } catch {
      globalMessage.error('加载异常数据失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void loadExceptions()
  }, [loadExceptions])

  const openHandleModal = useCallback((exception: CheckInException) => {
    setCurrentException(exception)
    setTargetStatus(exception.status === 'PENDING' ? 'PROCESSING' : 'COMPLETED')
    setModalVisible(true)
  }, [])

  const handleException = useCallback(async () => {
    if (!currentException || !targetStatus) {
      message.warning('请选择处理状态')
      return
    }

    try {
      const response = await checkInApi.handleException(
        currentException.id,
        targetStatus,
        handlerNote,
      )
      if (response.code === 200) {
        globalMessage.success('处理成功')
        resetModal()
        await loadExceptions()
      }
    } catch {
      globalMessage.error('处理失败')
    }
  }, [currentException, handlerNote, loadExceptions, resetModal, targetStatus])

  return {
    loading,
    exceptions,
    statusFilter,
    setStatusFilter,
    modalVisible,
    currentException,
    handlerNote,
    setHandlerNote,
    targetStatus,
    setTargetStatus,
    openHandleModal,
    handleException,
    resetModal,
  }
}
