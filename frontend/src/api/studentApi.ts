import request from './request'

export interface StudentDetailResponse {
  id: number
  studentNo: string
  name: string
  gender: number
  genderText: string
  grade: string
  major: string
  classCode: string
  counselorNo: string
  phone: string
  email: string
  dormitory: string
  emergencyContact: string
  infoCompleteness: number
  infoCompletenessText: string
  riskLevel: number
  riskLevelText: string
  createdAt: string
  updatedAt: string
}

export interface StudentQueryRequest {
  page?: number
  size?: number
  studentNo?: string
  name?: string
  classCode?: string
  counselorNo?: string
  infoCompleteness?: number
  riskLevel?: number
  grade?: string
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

export interface StudentCreateRequest {
  studentNo: string
  name: string
  gender: number
  grade: string
  major: string
  classCode: string
  counselorNo: string
  phone?: string
  email?: string
  dormitory?: string
  emergencyContact?: string
}

export interface StudentUpdateRequest extends Partial<StudentCreateRequest> {
  id: number
}

export const studentApi = {
  list: (params: StudentQueryRequest) =>
    request.get<unknown, ApiResponse<PageResponse<StudentDetailResponse>>>('/student/list', { params }),

  getById: (id: number) =>
    request.get<unknown, ApiResponse<StudentDetailResponse>>(`/student/${id}`),

  create: (data: StudentCreateRequest) =>
    request.post<unknown, ApiResponse<StudentDetailResponse>>('/student', data),

  update: (data: StudentUpdateRequest) =>
    request.put<unknown, ApiResponse<StudentDetailResponse>>('/student', data),

  delete: (id: number) =>
    request.delete<unknown, ApiResponse<null>>(`/student/${id}`),
}
