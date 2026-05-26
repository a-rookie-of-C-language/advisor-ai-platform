import { Card, Descriptions, List, Table, Tag } from 'antd'
import type { ImportResultResponse } from '../../api/studentImportApi'
import { importFailureColumns } from './studentImportFailureColumns'

interface StudentImportResultCardProps {
  importResult: ImportResultResponse
}

export function StudentImportResultCard({ importResult }: StudentImportResultCardProps) {
  return (
    <Card title="导入结果" style={{ marginTop: 24 }}>
      <Descriptions column={2}>
        <Descriptions.Item label="批次号">{importResult.batchNo}</Descriptions.Item>
        <Descriptions.Item label="总条数">{importResult.totalCount}</Descriptions.Item>
        <Descriptions.Item label="成功条数">
          <Tag color="green">{importResult.successCount}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="失败条数">
          <Tag color="red">{importResult.failCount}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="重复条数">
          <Tag color="orange">{importResult.duplicateCount}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="跳过条数">
          <Tag color="blue">{importResult.skipCount}</Tag>
        </Descriptions.Item>
      </Descriptions>

      {importResult.failDetails && importResult.failDetails.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>失败详情</h4>
          <Table
            columns={importFailureColumns}
            dataSource={importResult.failDetails}
            rowKey="row"
            size="small"
            pagination={false}
            scroll={{ y: 200 }}
          />
        </div>
      )}

      {importResult.duplicateStudentNos && importResult.duplicateStudentNos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>重复学号</h4>
          <List
            size="small"
            bordered
            dataSource={importResult.duplicateStudentNos}
            renderItem={(item) => <List.Item>{item}</List.Item>}
            style={{ maxHeight: 150, overflow: 'auto' }}
          />
        </div>
      )}
    </Card>
  )
}
