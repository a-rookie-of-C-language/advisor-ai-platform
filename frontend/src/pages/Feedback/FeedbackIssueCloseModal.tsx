import { Form, Input, Modal } from 'antd'

interface FeedbackIssueCloseModalProps {
  open: boolean
  loading: boolean
  onCancel: () => void
  onSubmit: (values: { reason: string }) => void
}

export default function FeedbackIssueCloseModal({
  open,
  loading,
  onCancel,
  onSubmit,
}: FeedbackIssueCloseModalProps) {
  const [form] = Form.useForm()

  return (
    <Modal
      title="关闭反馈"
      open={open}
      okText="关闭"
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
        onFinish={(values) => onSubmit({ reason: values.reason.trim() })}
      >
        <Form.Item name="reason" label="关闭理由" rules={[{ required: true, message: '请输入关闭理由' }]}>
          <Input.TextArea rows={5} placeholder="说明为什么关闭这个反馈" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
