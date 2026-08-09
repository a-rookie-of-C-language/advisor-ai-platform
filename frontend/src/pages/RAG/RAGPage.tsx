import { useState } from 'react'
import {
  Button,
  Form,
  Space,
  Typography,
  App,
} from 'antd'
import {
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { ragApi, type KnowledgeBaseDTO } from '../../api/ragApi'
import {
  KnowledgeBaseCreateModal,
  type KnowledgeBaseCreateForm,
} from './KnowledgeBaseCreateModal'
import { KnowledgeBaseGrid } from './KnowledgeBaseGrid'
import RagDocumentTable from './RagDocumentTable'
import { getErrorMessage } from './RagDisplay'
import { useKnowledgeBases } from './useKnowledgeBases'

const { Title, Text } = Typography

export default function RAGPage() {
  const { message: messageApi } = App.useApp()
  const [selectedKb, setSelectedKb] = useState<KnowledgeBaseDTO | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<KnowledgeBaseCreateForm>()
  const { kbs, loading, loadKnowledgeBases, deleteKnowledgeBase } = useKnowledgeBases(messageApi)

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

      <KnowledgeBaseGrid
        kbs={kbs}
        loading={loading}
        onSelect={setSelectedKb}
        onDelete={(id) => void deleteKnowledgeBase(id)}
      />

      <KnowledgeBaseCreateModal
        open={createOpen}
        creating={creating}
        form={form}
        onCreate={() => void handleCreate()}
        onCancel={() => {
          form.resetFields()
          setCreateOpen(false)
        }}
      />
    </div>
  )
}
