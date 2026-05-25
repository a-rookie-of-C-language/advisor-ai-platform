import { Button, Popconfirm, Space, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { NavigateFunction } from 'react-router-dom'
import type { StudentDetailResponse } from '../../api/studentApi'
import type { ImportResultResponse } from '../../api/studentImportApi'

export const INFO_COMPLETENESS_OPTIONS = [
  { value: 0, label: '完整', color: 'green' },
  { value: 1, label: '部分缺失', color: 'orange' },
  { value: 2, label: '严重缺失', color: 'red' },
]

export const RISK_LEVEL_OPTIONS = [
  { value: 0, label: '正常', color: 'green' },
  { value: 1, label: '关注', color: 'blue' },
  { value: 2, label: '预警', color: 'orange' },
  { value: 3, label: '严重', color: 'red' },
]

export function createStudentColumns(
  navigate: NavigateFunction,
  onDelete: (id: number) => void,
): ColumnsType<StudentDetailResponse> {
  return [
    {
      title: '学号',
      dataIndex: 'studentNo',
      key: 'studentNo',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '性别',
      dataIndex: 'genderText',
      key: 'genderText',
      width: 60,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
    },
    {
      title: '专业',
      dataIndex: 'major',
      key: 'major',
      width: 150,
    },
    {
      title: '班级',
      dataIndex: 'classCode',
      key: 'classCode',
      width: 120,
    },
    {
      title: '辅导员',
      dataIndex: 'counselorNo',
      key: 'counselorNo',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '信息完整度',
      dataIndex: 'infoCompletenessText',
      key: 'infoCompletenessText',
      width: 100,
      render: (text: string, record) => {
        const option = INFO_COMPLETENESS_OPTIONS.find((o) => o.value === record.infoCompleteness)
        return <Tag color={option?.color}>{text}</Tag>
      },
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevelText',
      key: 'riskLevelText',
      width: 80,
      render: (text: string, record) => {
        const option = RISK_LEVEL_OPTIONS.find((o) => o.value === record.riskLevel)
        return <Tag color={option?.color}>{text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/student/${record.id}`)}>
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => navigate(`/student/${record.id}`)}
          >
            打卡
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />}>
            编辑
          </Button>
          <Popconfirm title="确认删除该学生？" onConfirm={() => onDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]
}

export const importFailureColumns: ColumnsType<ImportResultResponse['failDetails'][number]> = [
  {
    title: '行号',
    dataIndex: 'row',
    key: 'row',
    width: 80,
  },
  {
    title: '学号',
    dataIndex: 'studentNo',
    key: 'studentNo',
    width: 120,
  },
  {
    title: '失败原因',
    dataIndex: 'reason',
    key: 'reason',
  },
]
