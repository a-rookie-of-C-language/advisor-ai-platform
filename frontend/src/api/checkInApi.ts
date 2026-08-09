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
  status?: string
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

export interface CheckInException {
  id: number
  studentId: number
  checkInId: string
  exceptionType: string
  status: string
  handlerId?: number
  handlerNote?: string
  handledAt?: string
  createdAt: string
  updatedAt: string
}

export interface AttendanceStatistics {
  totalRecords: number
  normalCount: number
  lateCount: number
  absentCount: number
  leaveCount: number
  attendanceRate: number
}

export interface ClassAttendanceStatistics {
  classCode: string
  className: string
  totalRecords: number
  normalCount: number
  lateCount: number
  absentCount: number
  leaveCount: number
  attendanceRate: number
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

  // 异常处理
  handleException: (exceptionId: number, status: string, handlerNote?: string) =>
    request.post<unknown, ApiResponse<CheckInException>>(
      `/check-in/exceptions/${exceptionId}/handle`,
      { status, handlerNote }
    ),

  listExceptions: (params?: { studentId?: number; checkInId?: string; status?: string }) =>
    request.get<unknown, ApiResponse<CheckInException[]>>('/check-in/exceptions', { params }),

  // 统计查询
  getAttendanceStatistics: (params?: { begin?: string; end?: string }) =>
    request.get<unknown, ApiResponse<AttendanceStatistics>>('/check-in/statistics', { params }),

  getClassAttendanceStatistics: (params?: { begin?: string; end?: string }) =>
    request.get<unknown, ApiResponse<ClassAttendanceStatistics[]>>('/check-in/statistics/class', { params }),

  // 导出
  exportAttendanceRecords: (params?: {
    studentId?: number
    checkInId?: string
    begin?: string
    end?: string
  }) =>
    request.get('/check-in/export', {
      params,
      responseType: 'blob',
    }),
}
