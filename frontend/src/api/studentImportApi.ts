import request from './request'

export interface ImportResultResponse {
  batchNo: string
  totalCount: number
  successCount: number
  failCount: number
  duplicateCount: number
  skipCount: number
  failDetails: Array<{ row: string; studentNo: string; reason: string }>
  duplicateStudentNos: string[]
}

export interface ImportBatchResponse {
  id: number
  batchNo: string
  fileName: string
  status: number
  statusText: string
  totalCount: number
  successCount: number
  failCount: number
  duplicateCount: number
  failDetails: string
  createdBy: string
  createdAt: string
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const studentImportApi = {
  getTemplateUrl: () => '/student/import/template',

  upload: (file: File, overwrite = true) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('overwrite', String(overwrite))
    return request.post<unknown, ApiResponse<ImportResultResponse>>('/student/import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  listBatches: (page = 0, size = 10) =>
    request.get<unknown, ApiResponse<PageResponse<ImportBatchResponse>>>('/student/import/batches', {
      params: { page, size },
    }),

  getDuplicates: () =>
    request.get<unknown, ApiResponse<string[]>>('/student/import/duplicates'),
}
