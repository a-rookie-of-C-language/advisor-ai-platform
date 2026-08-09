import { useCallback, useEffect, useState } from 'react'
import { ragApi, type KnowledgeBaseDTO } from '../../api/ragApi'
import { getErrorMessage } from './RagDisplay'

interface RagMessageApi {
  error: (content: string) => void
  success: (content: string) => void
}

export function useKnowledgeBases(messageApi: RagMessageApi) {
  const [kbs, setKbs] = useState<KnowledgeBaseDTO[]>([])
  const [loading, setLoading] = useState(false)

  const loadKnowledgeBases = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ragApi.listKnowledgeBases()
      setKbs(res.data)
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [messageApi])

  useEffect(() => {
    void loadKnowledgeBases()
  }, [loadKnowledgeBases])

  const deleteKnowledgeBase = async (id: number) => {
    try {
      await ragApi.deleteKnowledgeBase(id)
      messageApi.success('知识库已删除')
      await loadKnowledgeBases()
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    }
  }

  return {
    kbs,
    loading,
    loadKnowledgeBases,
    deleteKnowledgeBase,
  }
}
