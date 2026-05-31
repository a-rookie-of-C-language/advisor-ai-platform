import { Input, Modal, Select, Space } from 'antd'
import type { CheckInException } from '../../api/checkInApi'
import { renderExceptionTypeTag } from './checkInDisplay'

const { TextArea } = Input
const { Option } = Select

type ExceptionHandlingModalProps = {
  open: boolean
  currentException: CheckInException | null
  handlerNote: string
  targetStatus: string
  onHandlerNoteChange: (value: string) => void
  onTargetStatusChange: (value: string) => void
  onOk: () => void
  onCancel: () => void
}

export default function ExceptionHandlingModal({
  open,
  currentException,
  handlerNote,
  targetStatus,
  onHandlerNoteChange,
  onTargetStatusChange,
  onOk,
  onCancel,
}: ExceptionHandlingModalProps) {
  return (
    <Modal
      title="处理异常"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="确认处理"
      cancelText="取消"
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <strong>学生ID：</strong>
          {currentException?.studentId}
        </div>
        <div>
          <strong>异常类型：</strong>
          {currentException?.exceptionType && renderExceptionTypeTag(currentException.exceptionType)}
        </div>
        <div>
          <strong>处理状态：</strong>
          <Select
            value={targetStatus}
            onChange={onTargetStatusChange}
            style={{ width: '100%' }}
          >
            {currentException?.status === 'PENDING' && (
              <Option value="PROCESSING">处理中</Option>
            )}
            <Option value="COMPLETED">已完成</Option>
            <Option value="CLOSED">已关闭</Option>
          </Select>
        </div>
        <div>
          <strong>处理备注：</strong>
          <TextArea
            value={handlerNote}
            onChange={(event) => onHandlerNoteChange(event.target.value)}
            placeholder="请输入处理备注"
            rows={4}
          />
        </div>
      </Space>
    </Modal>
  )
}
