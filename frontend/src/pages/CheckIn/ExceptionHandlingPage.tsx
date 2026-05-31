import { Card, Select, Space, Table } from 'antd'
import { useMemo } from 'react'
import { buildExceptionColumns } from './ExceptionHandlingColumns'
import ExceptionHandlingModal from './ExceptionHandlingModal'
import { useCheckInExceptions } from './useCheckInExceptions'

const { Option } = Select

export default function ExceptionHandlingPage() {
  const {
    loading,
    exceptions,
    setStatusFilter,
    modalVisible,
    currentException,
    handlerNote,
    setHandlerNote,
    targetStatus,
    setTargetStatus,
    openHandleModal,
    handleException,
    resetModal,
  } = useCheckInExceptions()

  const columns = useMemo(
    () => buildExceptionColumns({ onHandle: openHandleModal }),
    [openHandleModal],
  )

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="异常处理"
        extra={
          <Space>
            <Select
              placeholder="筛选状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setStatusFilter(value)}
            >
              <Option value="PENDING">待处理</Option>
              <Option value="PROCESSING">处理中</Option>
              <Option value="COMPLETED">已完成</Option>
              <Option value="CLOSED">已关闭</Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={exceptions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <ExceptionHandlingModal
        open={modalVisible}
        currentException={currentException}
        handlerNote={handlerNote}
        targetStatus={targetStatus}
        onHandlerNoteChange={setHandlerNote}
        onTargetStatusChange={setTargetStatus}
        onOk={handleException}
        onCancel={resetModal}
      />
    </div>
  )
}
