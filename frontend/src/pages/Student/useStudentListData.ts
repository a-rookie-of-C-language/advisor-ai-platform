import { useEffect, useState } from 'react'
import type { FormInstance } from 'antd'
import { studentApi, type StudentDetailResponse, type StudentQueryRequest } from '../../api/studentApi'
import { globalMessage } from '../../utils/globalMessage'

export function useStudentListData(searchForm: FormInstance<StudentQueryRequest>) {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<StudentDetailResponse[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const loadData = async (
    page = pagination.current,
    size = pagination.pageSize,
    params: StudentQueryRequest = {},
  ) => {
    setLoading(true)
    try {
      const queryParams = {
        page: page - 1,
        size: size || 10,
        ...params,
      }
      const response = await studentApi.list(queryParams)
      if (response.code === 200) {
        setDataSource(response.data.content || [])
        setPagination((prev) => ({
          ...prev,
          total: response.data.totalElements || 0,
        }))
      }
    } catch {
      globalMessage.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleSearch = () => {
    const values = searchForm.getFieldsValue()
    setPagination((prev) => ({ ...prev, current: 1 }))
    void loadData(1, pagination.pageSize, values)
  }

  const handleReset = () => {
    searchForm.resetFields()
    void loadData()
  }

  const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
    const newPage = paginationConfig.current || 1
    const newSize = paginationConfig.pageSize || pagination.pageSize
    setPagination((prev) => ({
      ...prev,
      current: newPage,
      pageSize: newSize,
    }))
    const values = searchForm.getFieldsValue()
    void loadData(newPage, newSize, values)
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await studentApi.delete(id)
      if (response.code === 200) {
        globalMessage.success('删除成功')
        void loadData()
      }
    } catch {
      globalMessage.error('删除失败')
    }
  }

  return {
    loading,
    dataSource,
    pagination,
    loadData,
    handleSearch,
    handleReset,
    handleTableChange,
    handleDelete,
  }
}
