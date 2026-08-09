import { Button, type TableColumnsType } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import type { CheckInException } from '../../api/checkInApi'
import { renderExceptionStatusTag, renderExceptionTypeTag } from './checkInDisplay'

type BuildExceptionColumnsOptions = {
  onHandle: (exception: CheckInException) => void
}

export function buildExceptionColumns({
  onHandle,
}: BuildExceptionColumnsOptions): TableColumnsType<CheckInException> {
  return [
    {
      title: '学生ID',
      dataIndex: 'studentId',
      key: 'studentId',
    },
    {
      title: '打卡活动',
      dataIndex: 'checkInId',
      key: 'checkInId',
    },
    {
      title: '异常类型',
      dataIndex: 'exceptionType',
      key: 'exceptionType',
      render: (type: string) => renderExceptionTypeTag(type),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderExceptionStatusTag(status),
    },
    {
      title: '处理人',
      dataIndex: 'handlerId',
      key: 'handlerId',
      render: (handlerId?: number) => handlerId || '-',
    },
    {
      title: '处理备注',
      dataIndex: 'handlerNote',
      key: 'handlerNote',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record) => (
        <Button
          type="primary"
          size="small"
          icon={<ExclamationCircleOutlined />}
          disabled={record.status === 'COMPLETED' || record.status === 'CLOSED'}
          onClick={() => onHandle(record)}
        >
          处理
        </Button>
      ),
    },
  ]
}
