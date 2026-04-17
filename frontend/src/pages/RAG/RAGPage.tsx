import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Table,
  Tag,
  Space,
  Typography,
  Upload,
  App,
  Popconfirm,
  Tooltip,
  Progress,
  Row,
  Col,
  Empty,
} from 'antd'
import {
  DatabaseOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  ArrowLeftOutlined,
  InboxOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload'
import { ragApi, type KnowledgeBaseDTO, type RagDocumentDTO } from '../../api/ragApi'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  return '请求失败，请稍后重试'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type: string) {
  const normalized = type.toLowerCase()
  if (normalized === 'pdf') return <FilePdfOutlined style={{ color: '#EF4444', fontSize: 16 }} />
  if (normalized === 'docx') return <FileWordOutlined style={{ color: '#2563EB', fontSize: 16 }} />
  return <FileTextOutlined style={{ color: '#6B7280', fontSize: 16 }} />
}

const kbStatusColor: Record<KnowledgeBaseDTO['status'], string> = {
  READY: 'green',
  INDEXING: 'orange',
  FAILED: 'red',
}

const kbStatusLabel: Record<KnowledgeBaseDTO['status'], string> = {
  READY: '就绪',
  INDEXING: '索引中',
  FAILED: '失败',
}

const docStatusColor: Record<RagDocumentDTO['status'], string> = {
  PENDING: 'gold',
  INDEXING: 'orange',
  READY: 'green',
  FAILED: 'red',
}

const docStatusLabel: Record<RagDocumentDTO['status'], string> = {
  PENDING: '待处理',
  INDEXING: '索引中',
  READY: '就绪',
  FAILED: '失败',
}

interface DocTableProps {
  kbId: number
  kbName: string
  onBack: () => void
  onChanged: () => Promise<void>
}

function DocTable({ kbId, kbName, onBack, onChanged }: DocTableProps) {
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

export default function RAGPage() {
  const { message: messageApi } = App.useApp()
  const [kbs, setKbs] = useState<KnowledgeBaseDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedKb, setSelectedKb] = useState<KnowledgeBaseDTO | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()

  const loadKnowledgeBases = async () => {
    setLoading(true)
    try {
      const res = await ragApi.listKnowledgeBases()
      setKbs(res.data)
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadKnowledgeBases()
  }, [])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      await ragApi.createKnowledgeBase({
        name: values.name,
        description: values.description ?? '',
      })
      messageApi.success('知识库创建成功')
      setCreateOpen(false)
      form.resetFields()
      await loadKnowledgeBases()
    } catch (error) {
      if (typeof error === 'object' && error && 'errorFields' in error) {
        return
      }
      messageApi.error(getErrorMessage(error))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteKb = async (id: number) => {
    try {
      await ragApi.deleteKnowledgeBase(id)
      messageApi.success('知识库已删除')
      await loadKnowledgeBases()
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    }
  }

  const kbCards = useMemo(() => kbs, [kbs])

  if (selectedKb) {
    return (
      <DocTable
        kbId={selectedKb.id}
        kbName={selectedKb.name}
        onBack={() => {
          setSelectedKb(null)
          void loadKnowledgeBases()
        }}
        onChanged={loadKnowledgeBases}
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>知识库管理</Title>
          <Text type="secondary">创建和管理 RAG 知识库，上传文档供 AI 检索。</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadKnowledgeBases()} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建知识库
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {kbCards.length === 0 && !loading && (
          <Col span={24}>
            <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #E2E8F0', textAlign: 'center', padding: '40px 0' }}>
              <Empty description="暂无知识库，点击右上角新建" />
            </Card>
          </Col>
        )}
        {kbCards.map((kb) => (
          <Col key={kb.id} xs={24} sm={12} lg={8}>
            <Card
              bordered={false}
              loading={loading}
              style={{ borderRadius: 10, border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'box-shadow 200ms ease' }}
              hoverable
              onClick={() => setSelectedKb(kb)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Space>
                  <div style={{ padding: 10, background: '#EFF6FF', borderRadius: 8 }}>
                    <DatabaseOutlined style={{ fontSize: 22, color: '#2563EB' }} />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15 }}>{kb.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{kb.description || '暂无描述'}</Text>
                  </div>
                </Space>
                <Popconfirm
                  title="确认删除该知识库？此操作不可恢复"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    void handleDeleteKb(kb.id)
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Tooltip title="删除知识库">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      style={{ marginTop: -4 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                </Popconfirm>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <FileTextOutlined style={{ marginRight: 4 }} />{kb.docCount} 份文档
                </Text>
                <Space>
                  <Tag color={kbStatusColor[kb.status]}>{kbStatusLabel[kb.status]}</Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>{kb.createdAt}</Text>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title="新建知识库"
        open={createOpen}
        onOk={() => void handleCreate()}
        confirmLoading={creating}
        onCancel={() => {
          form.resetFields()
          setCreateOpen(false)
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[{ required: true, message: '请输入知识库名称' }]}
          >
            <Input placeholder="例：思政教育资料库" maxLength={128} showCount />
          </Form.Item>
          <Form.Item name="description" label="描述（可选）">
            <Input.TextArea placeholder="简要描述该知识库的用途" rows={3} maxLength={256} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
