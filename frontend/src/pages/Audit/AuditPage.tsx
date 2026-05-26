import { useState } from 'react'
import {
  Card,
  Table,
  Space,
  Button,
  Typography,
  App,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { AuditLogDTO } from '../../api/auditApi'
import { AuditDetailModal } from './AuditDetailModal'
import { AuditFilterBar } from './AuditFilterBar'
import { createAuditLogColumns } from './AuditLogTableColumns'
import { useAuditLogs } from './useAuditLogs'

const { Title } = Typography

export default function AuditPage() {
  const { message: messageApi } = App.useApp()
  const [selectedLog, setSelectedLog] = useState<AuditLogDTO | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const {
    loading,
    data,
    total,
    page,
    size,
    queryParams,
    loadData,
    handleFilterChange,
    handleReset,
    handlePageChange,
  } = useAuditLogs(messageApi)

  const handleViewDetail = async (record: AuditLogDTO) => {
    setSelectedLog(record)
    setDetailVisible(true)
  }


  const columns = createAuditLogColumns(handleViewDetail)

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={<Title level={4}>瀹¤鏃ュ織</Title>}
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void loadData()}>
            鍒锋柊
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <AuditFilterBar
            queryParams={queryParams}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />

          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{
              current: page,
              pageSize: size,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (t) => `共 ${t} 条`,
              onChange: handlePageChange,
            }}
          />
        </Space>
      </Card>

      <AuditDetailModal
        open={detailVisible}
        selectedLog={selectedLog}
        onClose={() => setDetailVisible(false)}
      />
    </div>
  )
}
