import {
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
} from '@ant-design/icons'

export function getFileIcon(fileType: string) {
  const t = fileType.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(t)) return <FileImageOutlined />
  if (t === 'pdf') return <FilePdfOutlined />
  if (['doc', 'docx'].includes(t)) return <FileWordOutlined />
  return <FileTextOutlined />
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
