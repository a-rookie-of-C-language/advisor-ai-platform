import request from './request'

export interface AvailableCheckInActivityVO {
  checkInId: string
  courseId: number
  courseName: string
  title: string
  checkedIn: boolean
  startTime: string
  endTime: string
}

export interface CheckInRecordVO {
  checkInId?: string
  activityTitle?: string
  studentId: number
  classCode?: string
  checkDate: string
  checkedIn: boolean
  checkTime?: string
}

export interface CheckInRecordQuery {
  studentId?: number
  checkInId?: string
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
  checkIn: (checkInId: string) =>
    request.post<unknown, ApiResponse<string>>(`/check-in/student/${checkInId}`),

  listAvailableActivities: () =>
    request.get<unknown, ApiResponse<AvailableCheckInActivityVO[]>>('/check-in/activities/available'),

  listRecords: (params: CheckInRecordQuery) =>
    request.get<unknown, ApiResponse<PageResultVO<CheckInRecordVO>>>('/check-in/records', { params }),
}
