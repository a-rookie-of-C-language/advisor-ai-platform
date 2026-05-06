import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Collapse, Empty, Input, Select, Space, Tag, Typography } from 'antd'
import {
  CloseCircleOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  LoadingOutlined,
  PaperClipOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { useSearchParams } from 'react-router-dom'
import { chatApi, type ChatSessionDTO, type StreamSourceItem } from '../../api/chatApi'
import { ragApi, type KnowledgeBaseDTO } from '../../api/ragApi'
import { workspaceApi, type WorkspaceFileDTO } from '../../api/workspaceApi'
import { globalMessage } from '../../utils/globalMessage'
import styles from './ChatPage.module.css'

const { Text, Title } = Typography

interface Source {
  id: number
  docName: string
  snippet: string
  score?: number
}

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  streaming?: boolean
  attachments?: WorkspaceFileDTO[]
}

interface ChatSession {
  id: number
  title: string
  updatedAt: string
  kbId: number
  messages: ChatMessage[]
}

interface MsgBubbleProps {
  msg: ChatMessage
}

function getFileIcon(fileType: string) {
  const t = fileType.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(t)) return <FileImageOutlined />
  if (t === 'pdf') return <FilePdfOutlined />
  if (['doc', 'docx'].includes(t)) return <FileWordOutlined />
  return <FileTextOutlined />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MsgBubble({ msg }: MsgBubbleProps) {
  const isUser = msg.role === 'user'

  return (
    <div className={`${styles.msgRow} ${isUser ? styles.msgRowUser : styles.msgRowAI}`}>
      <div className={styles.msgAvatar}>
        {isUser
          ? <div className={styles.avatarUser}><UserOutlined /></div>
          : <div className={styles.avatarAI}><RobotOutlined /></div>}
      </div>
      <div className={`${styles.msgBubble} ${isUser ? styles.bubbleUser : styles.bubbleAI}`}>
        {msg.attachments?.length ? (
          <div style={{ marginBottom: 8 }}>
            <Space wrap size={[4, 4]}>
              {msg.attachments.map((file) => (
                <Tag key={file.id} icon={getFileIcon(file.fileType)} color="default" style={{ fontSize: 11 }}>
                  {file.fileName}
                </Tag>
              ))}
            </Space>
          </div>
        ) : null}

        {msg.streaming && !msg.content
          ? <LoadingOutlined style={{ color: '#2563EB' }} />
          : isUser
            ? <Text>{msg.content}</Text>
            : (
              <div className={styles.markdownBody}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.streaming && <span className={styles.cursor} />}
              </div>
            )}

        {msg.sources?.length
          ? (
            <Collapse
              ghost
              size="small"
              style={{ marginTop: 8 }}
              items={[{
                key: '1',
                label: (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <FileTextOutlined style={{ marginRight: 4 }} />
                    引用来源 {msg.sources.length} 条
                  </Text>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {msg.sources.map((source) => (
                      <div key={source.id} style={{ background: '#F1F5F9', borderRadius: 6, padding: '8px 12px' }}>
                        <Tag color="blue" style={{ fontSize: 11, marginBottom: 4 }}>{source.docName}</Tag>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{source.snippet}</Text>
                      </div>
                    ))}
                  </Space>
                ),
              }]}
            />
            )
          : null}
      </div>
    </div>
  )
}

function toChatMessage(data: { id: number; role: 'user' | 'assistant'; content: string; sources?: StreamSourceItem[] }): ChatMessage {
  return {
    id: data.id,
    role: data.role,
    content: data.content,
    sources: data.sources?.map((item, index) => ({
      id: item.id || index + 1,
      docName: item.docName || '未命名文档',
      snippet: item.snippet || '',
      score: item.score,
    })),
    streaming: false,
  }
}

function toChatSession(data: ChatSessionDTO): ChatSession {
  return {
    id: data.id,
    title: data.title,
    updatedAt: data.updatedAt,
    kbId: data.kbId ?? 0,
    messages: [],
  }
}

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_FILES = 10

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseDTO[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<WorkspaceFileDTO[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? null,
    [sessions, activeId],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages])

  useEffect(() => {
    void (async () => {
      try {
        const response = await chatApi.listSessions()
        const nextSessions: ChatSession[] = (response.data ?? []).map(toChatSession)
        setSessions(nextSessions)
        const routeSessionId = Number(searchParams.get('sessionId') ?? '')
        if (nextSessions.length > 0 && Number.isFinite(routeSessionId) && routeSessionId > 0) {
          const matched = nextSessions.find((item) => item.id === routeSessionId)
          setActiveId(matched ? matched.id : nextSessions[0].id)
        } else if (nextSessions.length > 0) {
          setActiveId(nextSessions[0].id)
        }
      } catch (error) {
        globalMessage.error(typeof error === 'string' ? error : '加载会话失败')
      }
    })()
  }, [])

  useEffect(() => {
    const routeSessionId = Number(searchParams.get('sessionId') ?? '')
    if (Number.isFinite(routeSessionId) && routeSessionId > 0 && routeSessionId !== activeId) {
      setActiveId(routeSessionId)
    }
  }, [searchParams, activeId])

  useEffect(() => {
    if (activeId == null) {
      return
    }
    setSearchParams({ sessionId: String(activeId) }, { replace: true })
  }, [activeId, setSearchParams])

  useEffect(() => {
    void (async () => {
      try {
        const response = await ragApi.listKnowledgeBases()
        setKnowledgeBases(response.data ?? [])
      } catch (error) {
        globalMessage.error(typeof error === 'string' ? error : '加载知识库失败')
      }
    })()
  }, [])

  useEffect(() => {
    if (activeId == null) {
      return
    }

    void (async () => {
      try {
        const response = await chatApi.listMessages(activeId)
        const messages = (response.data ?? []).map(toChatMessage)
        setSessions((prev) => prev.map((session) => (
          session.id === activeId
            ? { ...session, messages }
            : session
        )))
      } catch (error) {
        globalMessage.error(typeof error === 'string' ? error : '加载消息失败')
      }
    })()
  }, [activeId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (pendingFiles.length + files.length > MAX_FILES) {
      globalMessage.warning(`最多只能上传 ${MAX_FILES} 个文件`)
      return
    }

    const sessionId = activeSession?.id
    if (!sessionId) {
      globalMessage.warning('请先创建会话后再上传文件')
      return
    }

    setUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
          globalMessage.warning(`不支持的文件类型: ${file.name}`)
          return null
        }
        if (file.size > MAX_FILE_SIZE) {
          globalMessage.warning(`文件过大(最大20MB): ${file.name}`)
          return null
        }
        const resp = await workspaceApi.uploadFile(sessionId, file)
        return resp.data
      })

      const results = await Promise.all(uploadPromises)
      const validFiles = results.filter((f): f is WorkspaceFileDTO => f !== null)
      setPendingFiles((prev) => [...prev, ...validFiles])
    } catch (error) {
      globalMessage.error(typeof error === 'string' ? error : '文件上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removePendingFile = (fileId: number) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== fileId))
    void workspaceApi.deleteFile(fileId)
  }

  const handleSelectKb = async (kbId: number) => {
    if (!activeSession) {
      return
    }
    try {
      const response = await chatApi.updateSessionKb(activeSession.id, kbId)
      const updated = response.data
      setSessions((prev) => prev.map((session) => (
        session.id === activeSession.id
          ? { ...session, kbId: updated.kbId ?? 0, updatedAt: updated.updatedAt }
          : session
      )))
      globalMessage.success(kbId > 0 ? '知识库已绑定到当前会话' : '已取消当前会话的知识库绑定')
    } catch (error) {
      globalMessage.error(typeof error === 'string' ? error : '更新会话知识库失败')
    }
  }

  const updateAssistantMessage = (sessionId: number, messageId: number, patch: Partial<ChatMessage>) => {
    setSessions((prev) => prev.map((session) => {
      if (session.id !== sessionId) {
        return session
      }
      return {
        ...session,
        messages: session.messages.map((msg) => (msg.id === messageId ? { ...msg, ...patch } : msg)),
      }
    }))
  }

  const toDisplaySources = (items: StreamSourceItem[], message?: string): Source[] => {
    if (items.length > 0) {
      return items.map((item, index) => ({
        id: item.id || index + 1,
        docName: item.docName || '未命名文档',
        snippet: item.snippet || '',
        score: item.score,
      }))
    }
    return [{
      id: -1,
      docName: '检索提示',
      snippet: message || '未返回可展示来源',
    }]
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if ((!text && pendingFiles.length === 0) || sending) {
      return
    }

    let targetSession = activeSession
    if (!targetSession) {
      try {
        const response = await chatApi.createSession()
        const created = response.data
        targetSession = toChatSession(created)
        setSessions((prev) => [targetSession!, ...prev])
        setActiveId(targetSession.id)
      } catch (error) {
        globalMessage.error(typeof error === 'string' ? error : '创建会话失败，无法发送消息')
        return
      }
    }

    if (!targetSession) {
      return
    }

    const sessionId = targetSession.id
    const userMsgId = Date.now()
    const aiMsgId = userMsgId + 1
    const currentAttachments = [...pendingFiles]

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      streaming: false,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    }
    const assistantPlaceholder: ChatMessage = { id: aiMsgId, role: 'assistant', content: '', streaming: true }

    const historyMessages = [
      ...targetSession.messages,
      userMessage,
    ]
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
        attachments: msg.attachments?.map((f) => f.id),
      }))
      .filter((msg) => msg.content.length > 0 || (msg.attachments && msg.attachments.length > 0))

    setInputText('')
    setPendingFiles([])
    setSending(true)
    setSessions((prev) => {
      let matched = false
      const mapped = prev.map((session) => {
        if (session.id !== sessionId) {
          return session
        }
        matched = true
        const nextTitle = session.messages.length === 0 ? text.slice(0, 5) : session.title
        return {
          ...session,
          title: nextTitle,
          messages: [...session.messages, userMessage, assistantPlaceholder],
        }
      })

      if (matched) {
        return mapped
      }

      return [{
        id: sessionId,
        title: text.slice(0, 5),
        updatedAt: targetSession.updatedAt,
        kbId: targetSession.kbId,
        messages: [userMessage, assistantPlaceholder],
      }, ...mapped]
    })

    try {
      let streamFailed = false
      let streamError = ''

      await chatApi.streamChat(
        {
          messages: historyMessages,
          sessionId,
          attachments: currentAttachments.map((f) => f.id),
        },
        {
          onDelta: (chunk) => {
            setSessions((prev) => prev.map((session) => {
              if (session.id !== sessionId) {
                return session
              }
              return {
                ...session,
                messages: session.messages.map((msg) => (
                  msg.id === aiMsgId
                    ? { ...msg, content: `${msg.content}${chunk}`, streaming: true }
                    : msg
                )),
              }
            }))
          },
          onEnd: () => {
            updateAssistantMessage(sessionId, aiMsgId, { streaming: false })
          },
          onSources: (items, _status, message) => {
            updateAssistantMessage(sessionId, aiMsgId, {
              sources: toDisplaySources(items, message),
            })
          },
          onError: (message) => {
            streamFailed = true
            streamError = message ?? 'stream error'
          },
          onRiskAlert: (alertData) => {
            updateAssistantMessage(sessionId, aiMsgId, {
              streaming: false,
              content: alertData.message || '该内容因不合规已被过滤',
            })
          },
        },
      )

      if (streamFailed) {
        globalMessage.warning('流式失败，已自动降级为非流式请求')
        const fallbackResp = await chatApi.sendMessage(sessionId, text)
        updateAssistantMessage(sessionId, aiMsgId, {
          streaming: false,
          content: fallbackResp.data?.content ?? (streamError || '请求失败，请稍后重试。'),
        })
      }
    } catch {
      globalMessage.warning('流式失败，已自动降级为非流式请求')
      try {
        const fallbackResp = await chatApi.sendMessage(sessionId, text)
        updateAssistantMessage(sessionId, aiMsgId, {
          streaming: false,
          content: fallbackResp.data?.content ?? '请求失败，请稍后重试。',
        })
      } catch (fallbackError) {
        updateAssistantMessage(sessionId, aiMsgId, {
          streaming: false,
          content: typeof fallbackError === 'string' ? `请求失败：${fallbackError}` : '请求失败，请稍后重试。',
        })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {activeSession && (
          <div style={{ padding: '16px 20px 0' }}>
            <Space align="center" wrap>
              <Text type="secondary">当前知识库</Text>
              <Select
                value={activeSession.kbId}
                style={{ minWidth: 240 }}
                disabled={sending}
                onChange={(value) => void handleSelectKb(value)}
                options={[
                  { value: 0, label: '不使用知识库' },
                  ...knowledgeBases.map((kb) => ({ value: kb.id, label: kb.name })),
                ]}
              />
            </Space>
          </div>
        )}
        {!activeSession || activeSession.messages.length === 0
          ? (
            <div className={styles.emptyChat}>
              <RobotOutlined style={{ fontSize: 52, color: '#CBD5E1', marginBottom: 16 }} />
              <Title level={4} style={{ color: '#94A3B8', marginBottom: 8 }}>开始和 AI 助手对话</Title>
              <Text type="secondary">输入问题后发送，系统会按流式返回答案。</Text>
            </div>
            )
          : (
            <div className={styles.msgList}>
              {activeSession.messages.map((msg) => (
                <MsgBubble key={msg.id} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
            )}

        <div className={styles.inputArea}>
          {!activeSession && (
            <Empty description={<span>请先创建会话后再发送消息</span>} style={{ marginBottom: 12 }} />
          )}

          {pendingFiles.length > 0 && (
            <div style={{ marginBottom: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8 }}>
              <Space wrap size={[4, 4]}>
                {pendingFiles.map((file) => (
                  <Tag
                    key={file.id}
                    icon={getFileIcon(file.fileType)}
                    closable
                    closeIcon={<CloseCircleOutlined />}
                    onClose={() => removePendingFile(file.id)}
                    color="processing"
                    style={{ fontSize: 11 }}
                  >
                    {file.fileName} ({formatFileSize(file.fileSize)})
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          <div className={styles.inputRow}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.docx,.md,.txt"
              style={{ display: 'none' }}
              onChange={(e) => void handleFileSelect(e)}
            />
            <Button
              icon={<PaperClipOutlined />}
              disabled={sending || uploading || !activeSession}
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
              style={{ height: 40, borderRadius: 8 }}
            />

            <Input.TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入问题，按 Ctrl+Enter 发送"
              autoSize={{ minRows: 1, maxRows: 5 }}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                  void handleSend()
                }
              }}
              style={{ borderRadius: 8, resize: 'none', flex: 1 }}
            />

            <Button
              type="primary"
              icon={sending ? <LoadingOutlined /> : <SendOutlined />}
              disabled={(!inputText.trim() && pendingFiles.length === 0) || sending}
              onClick={() => void handleSend()}
              style={{ height: 40, paddingInline: 20, borderRadius: 8 }}
            >
              发送
            </Button>
          </div>

          <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block', textAlign: 'center' }}>
            AI 回答仅供参考，请结合实际情况进行判断。支持上传图片/PDF/Word/Markdown（单文件20MB，最多10个）
          </Text>
        </div>
      </main>
    </div>
  )
}
