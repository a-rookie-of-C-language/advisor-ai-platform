import { DeleteOutlined, FileTextOutlined, DatabaseOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Popconfirm, Row, Space, Tag, Tooltip, Typography } from 'antd'
import type { KnowledgeBaseDTO } from '../../api/ragApi'
import { kbStatusColor, kbStatusLabel } from './RagDisplay'

const { Text } = Typography

type KnowledgeBaseGridProps = {
  kbs: KnowledgeBaseDTO[]
  loading: boolean
  onSelect: (kb: KnowledgeBaseDTO) => void
  onDelete: (id: number) => void
}

export function KnowledgeBaseGrid({ kbs, loading, onSelect, onDelete }: KnowledgeBaseGridProps) {
  return (
    <Row gutter={[16, 16]}>
      {kbs.length === 0 && !loading && (
        <Col span={24}>
          <Card
            bordered={false}
            style={{ borderRadius: 10, border: '1px solid #E2E8F0', textAlign: 'center', padding: '40px 0' }}
          >
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
            onClick={() => onSelect(kb)}
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
                onConfirm={(event) => {
                  event?.stopPropagation()
                  onDelete(kb.id)
                }}
                onCancel={(event) => event?.stopPropagation()}
              >
                <Tooltip title="删除知识库">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ marginTop: -4 }}
                    onClick={(event) => event.stopPropagation()}
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
  )
}
