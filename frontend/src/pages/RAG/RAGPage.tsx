import { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  Space,
  Typography,
  App,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Empty,
} from 'antd'
import {
  DatabaseOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { ragApi, type KnowledgeBaseDTO } from '../../api/ragApi'
import RagDocumentTable from './RagDocumentTable'
import { getErrorMessage, kbStatusColor, kbStatusLabel } from './RagDisplay'

const { Title, Text } = Typography

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

  if (selectedKb) {
    return (
      <RagDocumentTable
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
        {kbs.length === 0 && !loading && (
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
