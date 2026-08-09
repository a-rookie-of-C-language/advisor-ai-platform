import { useCallback, useEffect, useState } from 'react'
import { auditApi, type AuditLogDTO } from '../../api/auditApi'
import {
  getAuditErrorMessage,
  type QueryParams,
} from './auditPageModel'

interface AuditMessageApi {
  error: (content: string) => void
}

export function useAuditLogs(messageApi: AuditMessageApi) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AuditLogDTO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [queryParams, setQueryParams] = useState<QueryParams>({
    page: 1,
    size: 20,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await auditApi.getAuditLogs(queryParams)
      setData(res.records)
      setTotal(res.total)
    } catch (error) {
      messageApi.error(getAuditErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [messageApi, queryParams])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleFilterChange = (key: keyof QueryParams, value: QueryParams[keyof QueryParams]) => {
    setQueryParams((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleReset = () => {
    setQueryParams({ page: 1, size: 20 })
  }

  const handlePageChange = (newPage: number, newSize: number) => {
    setPage(newPage)
    setSize(newSize)
    setQueryParams((prev) => ({ ...prev, page: newPage, size: newSize }))
  }

  return {
    loading,
    data,
    total,
    page,
    size,
    queryParams,
    loadData,
    handleFilterChange,
    handleReset,
    handlePageChange,
  }
}
