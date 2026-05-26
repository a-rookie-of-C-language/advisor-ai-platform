import { useEffect, useState } from 'react'
import { checkInApi, type AvailableCheckInActivityVO, type CheckInRecordVO } from '../../api/checkInApi'
import { globalMessage } from '../../utils/globalMessage'

export function useCheckInManagement() {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<CheckInRecordVO[]>([])
  const [activities, setActivities] = useState<AvailableCheckInActivityVO[]>([])
  const [total, setTotal] = useState(0)

  const loadData = async () => {
    setLoading(true)
    try {
      const [recordResponse, activityResponse] = await Promise.all([
        checkInApi.listRecords({ page: 1, pageSize: 10 }),
        checkInApi.listAvailableActivities(),
      ])
      if (recordResponse.code === 200) {
        setRecords(recordResponse.data.records || [])
        setTotal(recordResponse.data.total || 0)
      }
      if (activityResponse.code === 200) {
        setActivities(activityResponse.data || [])
      }
    } catch {
      globalMessage.error('加载打卡数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleCheckIn = async (checkInId: string) => {
    try {
      const response = await checkInApi.checkIn(checkInId)
      if (response.code === 200) {
        globalMessage.success(response.data || '打卡成功')
        void loadData()
      }
    } catch {
      globalMessage.error('打卡失败')
    }
  }

  return {
    loading,
    records,
    activities,
    total,
    handleCheckIn,
  }
}
