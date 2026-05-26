import { Form, Input, Modal, type FormInstance } from 'antd'

export type KnowledgeBaseCreateForm = {
  name: string
  description?: string
}

type KnowledgeBaseCreateModalProps = {
  open: boolean
  creating: boolean
  form: FormInstance<KnowledgeBaseCreateForm>
  onCreate: () => void
  onCancel: () => void
}

export function KnowledgeBaseCreateModal({
  open,
  creating,
  form,
  onCreate,
  onCancel,
}: KnowledgeBaseCreateModalProps) {
  return (
    <Modal
      title="新建知识库"
      open={open}
      onOk={onCreate}
      confirmLoading={creating}
      onCancel={onCancel}
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
  )
}
