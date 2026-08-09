import { SearchOutlined } from '@ant-design/icons'
import { Button, Form, Input, Select, Space, type FormInstance } from 'antd'
import type { StudentQueryRequest } from '../../api/studentApi'
import { INFO_COMPLETENESS_OPTIONS } from './studentListOptions'
import styles from './StudentListPage.module.css'

const { Option } = Select

type StudentSearchFormProps = {
  form: FormInstance<StudentQueryRequest>
  onSearch: () => void
  onReset: () => void
}

export function StudentSearchForm({ form, onSearch, onReset }: StudentSearchFormProps) {
  return (
    <div className={styles.searchArea}>
      <Form form={form} layout="inline" className={styles.searchForm}>
        <Form.Item name="studentNo" label="学号">
          <Input placeholder="请输入学号" style={{ width: 120 }} allowClear />
        </Form.Item>
        <Form.Item name="name" label="姓名">
          <Input placeholder="请输入姓名" style={{ width: 100 }} allowClear />
        </Form.Item>
        <Form.Item name="grade" label="年级">
          <Input placeholder="请输入年级" style={{ width: 100 }} allowClear />
        </Form.Item>
        <Form.Item name="classCode" label="班级">
          <Input placeholder="请输入班级" style={{ width: 120 }} allowClear />
        </Form.Item>
        <Form.Item name="infoCompleteness" label="信息完整度">
          <Select placeholder="请选择" style={{ width: 100 }} allowClear>
            {INFO_COMPLETENESS_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
              查询
            </Button>
            <Button onClick={onReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}
