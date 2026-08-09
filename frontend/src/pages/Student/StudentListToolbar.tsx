import { DownloadOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Space } from 'antd'
import styles from './StudentListPage.module.css'

interface StudentListToolbarProps {
  onDownloadTemplate: () => void
  onOpenImport: () => void
}

export function StudentListToolbar({
  onDownloadTemplate,
  onOpenImport,
}: StudentListToolbarProps) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>学生管理</h2>
      <Space>
        <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate}>
          下载导入模板
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={onOpenImport}>
          新增学生
        </Button>
      </Space>
    </div>
  )
}
