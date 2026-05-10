import request from './request'

export interface CheckInRecordVO {
  studentId: number
  checkDate: string
  checkedIn: boolean
  checkTime?: string
}

export interface CheckInRecordQuery {
  studentId?: number
  begin?: string
  end?: string
  page?: number
  pageSize?: number
}

export interface PageResultVO<T> {
  total: number
  records: T[]
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export const checkInApi = {
  checkIn: () => request.post<unknown, ApiResponse<string>>('/check-in/student'),

  listRecords: (params: CheckInRecordQuery) =>
    request.get<unknown, ApiResponse<PageResultVO<CheckInRecordVO>>>('/check-in/records', { params }),
}
