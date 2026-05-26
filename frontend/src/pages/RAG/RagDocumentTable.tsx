import {
  App,
  Button,
  Card,
  Empty,
  Space,
  Table,
  Typography,
} from 'antd'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { createRagDocumentColumns } from './RagDocumentColumns'
import RagDocumentUploader from './RagDocumentUploader'
import { useRagDocuments } from './useRagDocuments'

const { Title, Paragraph } = Typography

interface RagDocumentTableProps {
  kbId: number
  kbName: string
  onBack: () => void
  onChanged: () => Promise<void>
}

export default function RagDocumentTable({ kbId, kbName, onBack, onChanged }: RagDocumentTableProps) {
  const { message: messageApi } = App.useApp()
  const {
    docs,
    loading,
    uploading,
    fileList,
    loadDocuments,
    deleteDocument,
    uploadDocument,
    acceptFile,
    removeFile,
  } = useRagDocuments({ kbId, messageApi, onChanged })

  const columns = createRagDocumentColumns((id) => void deleteDocument(id))

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack} style={{ padding: '4px 8px' }}>
          返回知识库列表
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => void loadDocuments()} loading={loading}>
          刷新文档
        </Button>
      </Space>

      <Title level={4} style={{ marginBottom: 4 }}>{kbName}</Title>
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        管理该知识库中的文档，支持 PDF、DOCX、TXT 格式。
      </Paragraph>

      <RagDocumentUploader
        fileList={fileList}
        uploading={uploading}
        onFileAccepted={acceptFile}
        onFileRemoved={removeFile}
        onUpload={() => void uploadDocument()}
        onValidationError={(errorMessage) => messageApi.error(errorMessage)}
      />

      <Card bordered={false} style={{ border: '1px solid #E2E8F0', borderRadius: 10 }}>
        <Table
          columns={columns}
          dataSource={docs}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 份文档` }}
          locale={{ emptyText: <Empty description="暂无文档，请上传" /> }}
        />
      </Card>
    </div>
  )
}
