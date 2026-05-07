import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Upload,
  Radio,
  Card,
  Descriptions,
  List,
} from 'antd'
import { UploadOutlined, DownloadOutlined, InboxOutlined } from '@ant-design/icons'
import { studentImportApi, type ImportResultResponse, type ImportBatchResponse } from '../../api/studentImportApi'
import { globalMessage } from '../../utils/globalMessage'
import styles from './ImportManagementPage.module.css'

const { Dragger } = Upload

export default function ImportManagementPage() {
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [overwrite, setOverwrite] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResultResponse | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchData, setBatchData] = useState<ImportBatchResponse[]>([])
  const [batchPagination, setBatchPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const loadBatches = async (page = 0, size = 10) => {
    setBatchLoading(true)
    try {
      const response = await studentImportApi.listBatches(page, size)
      if (response.code === 200) {
        setBatchData(response.data.content || [])
        setBatchPagination((prev) => ({
          ...prev,
          total: response.data.totalElements || 0,
          current: page + 1,
        }))
      }
    } catch {
      globalMessage.error('加载导入记录失败')
    } finally {
      setBatchLoading(false)
    }
  }

  useEffect(() => {
    void loadBatches()
  }, [])

  const handleDownloadTemplate = () => {
    window.open(studentImportApi.getTemplateUrl(), '_blank')
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const response = await studentImportApi.upload(file, overwrite)
      if (response.code === 200) {
        setImportResult(response.data)
        globalMessage.success('导入完成')
        void loadBatches()
      }
    } catch (error) {
      globalMessage.error('导入失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  const batchColumns = [
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 200,
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'statusText',
      key: 'statusText',
      width: 80,
      render: (text: string, record: ImportBatchResponse) => {
        const color = record.status === 2 ? 'red' : record.status === 1 ? 'green' : 'processing'
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '总条数',
      dataIndex: 'totalCount',
      key: 'totalCount',
      width: 80,
    },
    {
      title: '成功',
      dataIndex: 'successCount',
      key: 'successCount',
      width: 80,
    },
    {
      title: '失败',
      dataIndex: 'failCount',
      key: 'failCount',
      width: 80,
    },
    {
      title: '重复',
      dataIndex: 'duplicateCount',
      key: 'duplicateCount',
      width: 80,
    },
    {
      title: '操作人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
    },
    {
      title: '导入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
    },
  ]

  const resultColumns = [
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>导入管理</h2>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载导入模板
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传导入
          </Button>
        </Space>
      </div>

      <Card title="导入历史" className={styles.card}>
        <Table
          columns={batchColumns}
          dataSource={batchData}
          rowKey="id"
          loading={batchLoading}
          pagination={{
            current: batchPagination.current,
            pageSize: batchPagination.pageSize,
            total: batchPagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, size) => {
              void loadBatches(page - 1, size)
            },
          }}
        />
      </Card>

      <Modal
        title="导入学生信息"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          setImportResult(null)
        }}
        footer={null}
        width={600}
      >
        <div style={{ padding: '24px 0' }}>
          <Dragger
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={handleUpload}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持 .xlsx 和 .xls 格式的 Excel 文件</p>
          </Dragger>

          <div style={{ marginTop: 16 }}>
            <Radio.Group value={overwrite} onChange={(e) => setOverwrite(e.target.value)}>
              <Radio value={true}>覆盖已有数据</Radio>
              <Radio value={false}>保留已有数据（跳过重复）</Radio>
            </Radio.Group>
          </div>

          {importResult && (
            <Card title="导入结果" style={{ marginTop: 24 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="批次号">{importResult.batchNo}</Descriptions.Item>
                <Descriptions.Item label="总条数">{importResult.totalCount}</Descriptions.Item>
                <Descriptions.Item label="成功条数">
                  <Tag color="green">{importResult.successCount}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="失败条数">
                  <Tag color="red">{importResult.failCount}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="重复条数">
                  <Tag color="orange">{importResult.duplicateCount}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="跳过条数">
                  <Tag color="blue">{importResult.skipCount}</Tag>
                </Descriptions.Item>
              </Descriptions>

              {importResult.failDetails && importResult.failDetails.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>失败详情</h4>
                  <Table
                    columns={resultColumns}
                    dataSource={importResult.failDetails}
                    rowKey="row"
                    size="small"
                    pagination={false}
                    scroll={{ y: 200 }}
                  />
                </div>
              )}

              {importResult.duplicateStudentNos && importResult.duplicateStudentNos.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>重复学号</h4>
                  <List
                    size="small"
                    bordered
                    dataSource={importResult.duplicateStudentNos}
                    renderItem={(item) => <List.Item>{item}</List.Item>}
                    style={{ maxHeight: 150, overflow: 'auto' }}
                  />
                </div>
              )}
            </Card>
          )}
        </div>
      </Modal>
    </div>
  )
}