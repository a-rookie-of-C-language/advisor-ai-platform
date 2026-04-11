import { useState } from 'react'
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
  message,
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
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

// ───── Mock 数据 ─────
interface KnowledgeBase {
  id: number
  name: string
  description: string
  docCount: number
  createdAt: string
  status: 'ready' | 'indexing'
}

interface RagDocument {
  id: number
  fileName: string
  fileType: string
  fileSize: number
  status: 'ready' | 'indexing' | 'failed'
  createdAt: string
}

const MOCK_KNOWLEDGE_BASES: KnowledgeBase[] = [
  { id: 1, name: '思政教育资料库', description: '收录课程思政、红色文化等相关资料', docCount: 18, createdAt: '2026-04-01', status: 'ready' },
  { id: 2, name: '学生工作政策库', description: '汇聚学生工作相关政策文件', docCount: 14, createdAt: '2026-04-03', status: 'ready' },
  { id: 3, name: '心理健康指导库', description: '心理危机干预、EAP等指导材料', docCount: 10, createdAt: '2026-04-08', status: 'indexing' },
]

const MOCK_DOCUMENTS: RagDocument[] = [
  { id: 1, fileName: '2025年思政工作指导意见.pdf', fileType: 'pdf', fileSize: 1240000, status: 'ready', createdAt: '2026-04-01 10:23' },
  { id: 2, fileName: '红岩精神传承手册.docx', fileType: 'docx', fileSize: 856000, status: 'ready', createdAt: '2026-04-02 14:15' },
  { id: 3, fileName: '课程思政案例集.txt', fileType: 'txt', fileSize: 210000, status: 'indexing', createdAt: '2026-04-03 09:00' },
]

// ───── 工具函数 ─────
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type: string) {
  if (type === 'pdf') return <FilePdfOutlined style={{ color: '#EF4444', fontSize: 16 }} />
  if (type === 'docx') return <FileWordOutlined style={{ color: '#2563EB', fontSize: 16 }} />
  return <FileTextOutlined style={{ color: '#6B7280', fontSize: 16 }} />
}

// ───── 文档列表 ─────
interface DocTableProps {
  kbId: number
  onBack: () => void
  kbName: string
}

function DocTable({ onBack, kbName }: DocTableProps) {
  const [docs, setDocs] = useState<RagDocument[]>(MOCK_DOCUMENTS)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const handleDelete = (id: number) => {
    setDocs((prev) => prev.filter((d) => d.id !== id))
    message.success('文档已删除')
  }

  const handleUpload = () => {
    if (!fileList.length) {
      message.warning('请先选择文件')
      return
    }
    setUploading(true)
    setTimeout(() => {
      const newDoc: RagDocument = {
        id: Date.now(),
        fileName: fileList[0].name,
        fileType: fileList[0].name.split('.').pop() ?? 'txt',
        fileSize: fileList[0].size ?? 0,
        status: 'indexing',
        createdAt: new Date().toLocaleString('zh-CN'),
      }
      setDocs((prev) => [newDoc, ...prev])
      setFileList([])
      setUploading(false)
      message.success('文件上传成功，正在索引中')
    }, 1500)
  }

  const statusColor: Record<string, string> = { ready: 'green', indexing: 'orange', failed: 'red' }
  const statusLabel: Record<string, string> = { ready: '就绪', indexing: '索引中', failed: '失败' }

  const columns: ColumnsType<RagDocument> = [
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
    { title: '大小', dataIndex: 'fileSize', render: (size) => formatFileSize(size), width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s) => (
        <Space>
          <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>
          {s === 'indexing' && <Progress size="small" percent={60} showInfo={false} style={{ width: 60 }} />}
        </Space>
      ),
    },
    { title: '上传时间', dataIndex: 'createdAt', width: 160 },
    {
      title: '操作', width: 80, align: 'center',
      render: (_, record) => (
        <Popconfirm title="确认删除该文档？" onConfirm={() => handleDelete(record.id)}>
          <Tooltip title="删除">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack} style={{ marginBottom: 16, padding: '4px 8px' }}>
        返回知识库列表
      </Button>
      <Title level={4} style={{ marginBottom: 4 }}>{kbName}</Title>
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>管理该知识库中的文档，支持 PDF、Word、TXT 格式</Paragraph>

      <Card bordered={false} style={{ marginBottom: 20, border: '1px solid #E2E8F0', borderRadius: 10 }}>
        <Dragger
          multiple={false}
          fileList={fileList}
          beforeUpload={(file) => {
            const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
            if (!allowed.includes(file.type)) {
              message.error('仅支持 PDF / DOCX / TXT 格式')
              return Upload.LIST_IGNORE
            }
            if (file.size > 50 * 1024 * 1024) {
              message.error('文件不能超过 50 MB')
              return Upload.LIST_IGNORE
            }
            setFileList([file])
            return false
          }}
          onRemove={() => setFileList([])}
          style={{ background: '#F8FAFC' }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#2563EB', fontSize: 40 }} /></p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">支持 PDF、DOCX、TXT，单文件不超过 50 MB</p>
        </Dragger>
        {fileList.length > 0 && (
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Button type="primary" icon={<UploadOutlined />} loading={uploading} onClick={handleUpload}>
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
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 份文档` }}
          locale={{ emptyText: <Empty description="暂无文档，请上传" /> }}
        />
      </Card>
    </div>
  )
}

// ───── 知识库列表 ─────
export default function RAGPage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>(MOCK_KNOWLEDGE_BASES)
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const handleCreate = () => {
    form.validateFields().then((values) => {
      const newKb: KnowledgeBase = {
        id: Date.now(),
        name: values.name,
        description: values.description ?? '',
        docCount: 0,
        createdAt: new Date().toLocaleDateString('zh-CN'),
        status: 'ready',
      }
      setKbs((prev) => [newKb, ...prev])
      message.success('知识库创建成功')
      form.resetFields()
      setCreateOpen(false)
    })
  }

  const handleDelete = (id: number) => {
    setKbs((prev) => prev.filter((kb) => kb.id !== id))
    message.success('知识库已删除')
  }

  if (selectedKb) {
    return <DocTable kbId={selectedKb.id} kbName={selectedKb.name} onBack={() => setSelectedKb(null)} />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>知识库管理</Title>
          <Text type="secondary">创建和管理 RAG 知识库，上传文档供 AI 检索</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建知识库
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {kbs.length === 0 && (
          <Col span={24}>
            <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #E2E8F0', textAlign: 'center', padding: '40px 0' }}>
              <Empty description="暂无知识库，点击右上角新建" />
            </Card>
          </Col>
        )}
        {kbs.map((kb) => (
          <Col key={kb.id} xs={24} sm={12} lg={8}>
            <Card
              bordered={false}
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
                    <Text type="secondary" style={{ fontSize: 12 }}>{kb.description}</Text>
                  </div>
                </Space>
                <Popconfirm
                  title="确认删除该知识库？此操作不可恢复"
                  onConfirm={(e) => { e?.stopPropagation(); handleDelete(kb.id) }}
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
                  <Tag color={kb.status === 'ready' ? 'green' : 'orange'}>
                    {kb.status === 'ready' ? '就绪' : '索引中'}
                  </Tag>
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
        onOk={handleCreate}
        onCancel={() => { form.resetFields(); setCreateOpen(false) }}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="知识库名称" rules={[{ required: true, message: '请输入知识库名称' }]}>
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
