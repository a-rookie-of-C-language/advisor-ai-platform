import { Button, Popconfirm, Progress, Space, Tag, Tooltip, Typography } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { RagDocumentDTO } from '../../api/ragApi'
import { docStatusColor, docStatusLabel, formatFileSize, getFileIcon } from './RagDisplay'

const { Text } = Typography

export function createRagDocumentColumns(onDelete: (id: number) => void): ColumnsType<RagDocumentDTO> {
  return [
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
        <Popconfirm title="确认删除该文档？" onConfirm={() => onDelete(record.id)}>
          <Tooltip title="删除">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ]
}
