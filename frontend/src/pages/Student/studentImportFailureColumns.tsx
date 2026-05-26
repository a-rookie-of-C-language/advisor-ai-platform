import type { ColumnsType } from 'antd/es/table'
import type { ImportResultResponse } from '../../api/studentImportApi'

export const importFailureColumns: ColumnsType<ImportResultResponse['failDetails'][number]> = [
  {
    title: '行号',
    dataIndex: 'row',
    key: 'row',
    width: 80,
  },
  {
    title: '学号',
    dataIndex: 'studentNo',
    key: 'studentNo',
    width: 120,
  },
  {
    title: '失败原因',
    dataIndex: 'reason',
    key: 'reason',
  },
]
