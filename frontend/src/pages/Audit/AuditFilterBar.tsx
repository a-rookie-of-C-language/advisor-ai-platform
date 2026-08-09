import { FilterOutlined } from '@ant-design/icons'
import { Button, DatePicker, Select, Space } from 'antd'
import dayjs from 'dayjs'
import { actionLabels, moduleLabels, type QueryParams } from './auditPageModel'

const { RangePicker } = DatePicker

type AuditFilterBarProps = {
  queryParams: QueryParams
  onFilterChange: (key: keyof QueryParams, value: QueryParams[keyof QueryParams]) => void
  onReset: () => void
}

export function AuditFilterBar({ queryParams, onFilterChange, onReset }: AuditFilterBarProps) {
  return (
    <Space wrap>
      <FilterOutlined />
      <Select
        placeholder="选择模块"
        allowClear
        style={{ width: 120 }}
        value={queryParams.module}
        onChange={(value) => onFilterChange('module', value)}
        options={Object.entries(moduleLabels).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      <Select
        placeholder="选择操作"
        allowClear
        style={{ width: 120 }}
        value={queryParams.action}
        onChange={(value) => onFilterChange('action', value)}
        options={Object.entries(actionLabels).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      <RangePicker
        showTime
        value={[
          queryParams.startTime ? dayjs(queryParams.startTime) : null,
          queryParams.endTime ? dayjs(queryParams.endTime) : null,
        ]}
        onChange={(dates) => {
          onFilterChange('startTime', dates?.[0]?.toISOString())
          onFilterChange('endTime', dates?.[1]?.toISOString())
        }}
      />
      <Button onClick={onReset}>重置</Button>
    </Space>
  )
}
