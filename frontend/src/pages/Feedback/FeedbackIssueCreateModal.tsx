import { Form, Input, Modal } from 'antd'

interface FeedbackIssueCreateModalProps {
  open: boolean
  loading: boolean
  onCancel: () => void
  onSubmit: (values: { title: string; content: string }) => void
}

export default function FeedbackIssueCreateModal({
  open,
  loading,
  onCancel,
  onSubmit,
}: FeedbackIssueCreateModalProps) {
  const [form] = Form.useForm()

  return (
    <Modal
      title="新建反馈"
      open={open}
      okText="提交"
      cancelText="取消"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(values) => onSubmit({
          title: values.title.trim(),
          content: values.content.trim(),
        })}
      >
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }, { max: 256, message: '标题不能超过 256 个字符' }]}
        >
          <Input placeholder="bug: 登录后页面闪退" />
        </Form.Item>
        <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
          <Input.TextArea rows={8} placeholder="描述现象、期望结果或补充信息" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
