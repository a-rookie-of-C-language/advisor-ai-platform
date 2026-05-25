import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Card,
  Empty,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, InboxOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload'
import { ragApi, type RagDocumentDTO } from '../../api/ragApi'
import {
  docStatusColor,
  docStatusLabel,
  formatFileSize,
  getErrorMessage,
  getFileIcon,
} from './RagDisplay'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

interface RagDocumentTableProps {
  kbId: number
  kbName: string
  onBack: () => void
  onChanged: () => Promise<void>
}

export default function RagDocumentTable({ kbId, kbName, onBack, onChanged }: RagDocumentTableProps) {
  const { message: messageApi } = App.useApp()
  const [docs, setDocs] = useState<RagDocumentDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const res = await ragApi.listDocuments(kbId)
      setDocs(res.data)
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [kbId])

  const handleDelete = async (id: number) => {
    try {
      await ragApi.deleteDocument(id)
      messageApi.success('文档已删除')
      await Promise.all([loadDocuments(), onChanged()])
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      messageApi.warning('请先选择文件')
      return
    }

    setUploading(true)
    try {
      await ragApi.uploadDocument(kbId, selectedFile)
      messageApi.success('文件上传成功，正在索引中')
      setFileList([])
      setSelectedFile(null)
      await Promise.all([loadDocuments(), onChanged()])
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    } finally {
      setUploading(false)
    }
  }

  const columns: ColumnsType<RagDocumentDTO> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      render: (name, record) => (
        <Space>
          {getFileIcon(record.fileType)}
          <Text>{name}</Text>
        </Space>
      ),
    },
    { title: '大小', dataIndex: 'fileSize', render: (size) => formatFileSize(size), width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (status: RagDocumentDTO['status']) => (
        <Space>
          <Tag color={docStatusColor[status]}>{docStatusLabel[status]}</Tag>
          {(status === 'PENDING' || status === 'INDEXING') && (
            <Progress size="small" percent={55} showInfo={false} style={{ width: 60 }} />
          )}
        </Space>
      ),
    },
    { title: '上传时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Popconfirm title="确认删除该文档？" onConfirm={() => void handleDelete(record.id)}>
          <Tooltip title="删除">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ]

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

      <Card bordered={false} style={{ marginBottom: 20, border: '1px solid #E2E8F0', borderRadius: 10 }}>
        <Dragger
          multiple={false}
          fileList={fileList}
          beforeUpload={(file) => {
            const allowed = [
              'application/pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'text/plain',
            ]
            if (!allowed.includes(file.type)) {
              messageApi.error('仅支持 PDF / DOCX / TXT 格式')
              return Upload.LIST_IGNORE
            }
            if (file.size > 50 * 1024 * 1024) {
              messageApi.error('文件不能超过 50 MB')
              return Upload.LIST_IGNORE
            }
            setSelectedFile(file as File)
            setFileList([file])
            return false
          }}
          onRemove={() => {
            setSelectedFile(null)
            setFileList([])
          }}
          style={{ background: '#F8FAFC' }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#2563EB', fontSize: 40 }} /></p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">支持 PDF、DOCX、TXT，单文件不超过 50 MB</p>
        </Dragger>
        {fileList.length > 0 && (
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Button type="primary" icon={<UploadOutlined />} loading={uploading} onClick={() => void handleUpload()}>
              开始上传
            </Button>
          </div>
        )}
      </Card>

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
