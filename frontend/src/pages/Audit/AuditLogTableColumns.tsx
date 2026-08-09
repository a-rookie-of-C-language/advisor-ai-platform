import { Button, Tag } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { AuditAction, AuditLogDTO, AuditModule } from '../../api/auditApi'
import { actionLabels, moduleColors, moduleLabels } from './auditPageModel'

export function createAuditLogColumns(
  onViewDetail: (record: AuditLogDTO) => void,
): ColumnsType<AuditLogDTO> {
  return [
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '用户',
      dataIndex: 'username',
      width: 100,
    },
    {
      title: '模块',
      dataIndex: 'module',
      width: 100,
      render: (val: AuditModule) => (
        <Tag color={moduleColors[val]}>{moduleLabels[val]}</Tag>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 100,
      render: (val: AuditAction) => actionLabels[val] || val,
    },
    {
      title: '请求路径',
      dataIndex: 'requestUri',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'responseStatus',
      width: 100,
      render: (val) => (
        <Tag color={val === 'SUCCESS' ? 'green' : 'red'}>{val === 'SUCCESS' ? '成功' : '失败'}</Tag>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      width: 100,
      render: (val) => `${val}ms`,
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      width: 140,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => onViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ]
}
