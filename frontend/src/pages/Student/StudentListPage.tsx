import {
  Table,
  Form,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import type { StudentQueryRequest } from '../../api/studentApi'
import styles from './StudentListPage.module.css'
import { createStudentColumns } from './StudentListColumns'
import { StudentImportModal } from './StudentImportModal'
import { StudentListToolbar } from './StudentListToolbar'
import { StudentSearchForm } from './StudentSearchForm'
import { useStudentImport } from './useStudentImport'
import { useStudentListData } from './useStudentListData'

export default function StudentListPage() {
  const navigate = useNavigate()
  const [searchForm] = Form.useForm<StudentQueryRequest>()
  const {
    loading,
    dataSource,
    pagination,
    loadData,
    handleSearch,
    handleReset,
    handleTableChange,
    handleDelete,
  } = useStudentListData(searchForm)

  const handleDownloadTemplate = () => {
    window.open('/templates/student-import-template.xlsx', '_blank')
  }

  const {
    uploadModalVisible,
    overwrite,
    uploading,
    importResult,
    openImportModal,
    closeImportModal,
    setOverwrite,
    handleUpload,
  } = useStudentImport(() => {
    void loadData()
  })

  const columns = createStudentColumns(navigate, handleDelete)

  return (
    <div className={styles.container}>
      <StudentListToolbar
        onDownloadTemplate={handleDownloadTemplate}
        onOpenImport={openImportModal}
      />

      <StudentSearchForm form={searchForm} onSearch={handleSearch} onReset={handleReset} />

      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        className={styles.table}
      />

      <StudentImportModal
        open={uploadModalVisible}
        overwrite={overwrite}
        uploading={uploading}
        importResult={importResult}
        onCancel={closeImportModal}
        onOverwriteChange={setOverwrite}
        onUpload={handleUpload}
      />
    </div>
  )
}
