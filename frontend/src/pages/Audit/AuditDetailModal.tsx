import { Button, Descriptions, Modal, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import type { AuditLogDTO } from '../../api/auditApi'
import {
  actionLabels,
  formatAuditJson,
  moduleColors,
  moduleLabels,
} from './auditPageModel'

const { Text } = Typography

type AuditDetailModalProps = {
  open: boolean
  selectedLog: AuditLogDTO | null
  onClose: () => void
}

export function AuditDetailModal({ open, selectedLog, onClose }: AuditDetailModalProps) {
  return (
    <Modal
      title="日志详情"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={800}
    >
      {selectedLog && (
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="ID">{selectedLog.id}</Descriptions.Item>
          <Descriptions.Item label="用户名">{selectedLog.username}</Descriptions.Item>
          <Descriptions.Item label="用户ID">{selectedLog.userId}</Descriptions.Item>
          <Descriptions.Item label="模块">
            <Tag color={moduleColors[selectedLog.module]}>{moduleLabels[selectedLog.module]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="操作">
            {actionLabels[selectedLog.action] || selectedLog.action}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={selectedLog.responseStatus === 'SUCCESS' ? 'green' : 'red'}>
              {selectedLog.responseStatus === 'SUCCESS' ? '成功' : '失败'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="方法">{selectedLog.method}</Descriptions.Item>
          <Descriptions.Item label="耗时">{selectedLog.durationMs}ms</Descriptions.Item>
          <Descriptions.Item label="请求路径" span={2}>
            {selectedLog.requestUri}
          </Descriptions.Item>
          <Descriptions.Item label="IP地址">{selectedLog.ipAddress}</Descriptions.Item>
          <Descriptions.Item label="User Agent" span={2}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {selectedLog.userAgent}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="请求参数" span={2}>
            <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
              {formatAuditJson(selectedLog.requestParams)}
            </pre>
          </Descriptions.Item>
          <Descriptions.Item label="响应数据" span={2}>
            <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
              {formatAuditJson(selectedLog.responseData)}
            </pre>
          </Descriptions.Item>
          {selectedLog.errorMessage && (
            <Descriptions.Item label="错误信息" span={2}>
              <Text type="danger">{selectedLog.errorMessage}</Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="创建时间" span={2}>
            {dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  )
}
