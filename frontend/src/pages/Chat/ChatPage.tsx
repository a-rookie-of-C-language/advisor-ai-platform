import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Collapse, Input, Skeleton, Space, Tag, Typography } from 'antd'
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
import {
  chatApi,
  type ChatSessionDTO,
  type StreamEventData,
  type StreamEventRecord,
  type StreamSourceItem,
  type StreamToolResult,
} from '../../api/chatApi'
import { globalMessage } from '../../utils/globalMessage'
import { emitChatSessionsRefresh, onChatSessionsRefresh } from './chatSessionEvents'
import styles from './ChatPage.module.css'

const { Text, Title } = Typography

interface Source {
  id: number
  docName: string
  snippet: string
  score?: number
}

interface ToolCall {
  id: string
  toolName: string
  input?: unknown
  status?: string
  message?: string
  result?: StreamToolResult
}

interface ChatEvent {
  id: string
  event: string
  payload: StreamEventData
  source?: string
  traceId?: string
  timestamp?: number
}

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  toolCalls?: ToolCall[]
  events?: ChatEvent[]
  streaming?: boolean
  progressText?: string
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

const PERSISTABLE_EVENTS = new Set([
  'tool_use',
  'tool_result',
  'tool_error',
  'sys_intent_route',
  'sys_tool_plan',
  'sys_rag_force',
  'risk_alert',
])

function isPersistableEvent(event: string): boolean {
  return PERSISTABLE_EVENTS.has(event)
}

function eventRecordId(event: string, payload: StreamEventData, fallback: string): string {
  const toolCallId = typeof payload.tool_call_id === 'string' ? payload.tool_call_id : ''
  if (toolCallId) {
    return `${event}:${toolCallId}`
  }
  return `${event}:${fallback}`
}

function normalizeEventRecord(record: StreamEventRecord, index: number): ChatEvent | null {
  if (!record?.event || !isPersistableEvent(record.event)) {
    return null
  }
  const payload = record.payload ?? {}
  return {
    id: eventRecordId(record.event, payload, `${record.timestamp ?? index}:${index}`),
    event: record.event,
    payload,
    source: record.source,
    traceId: record.traceId,
    timestamp: record.timestamp,
  }
}

function normalizeEventRecords(records?: StreamEventRecord[]): ChatEvent[] {
  return (records ?? [])
    .map(normalizeEventRecord)
    .filter((item): item is ChatEvent => item !== null)
}

function streamEventRecord(event: string, payload: StreamEventData): ChatEvent | null {
  if (!isPersistableEvent(event)) {
    return null
  }
  return {
    id: eventRecordId(event, payload, `${Date.now()}:${Math.random().toString(16).slice(2)}`),
    event,
    payload,
  }
}

function eventDisplayTitle(event: string, payload: StreamEventData): string {
  const toolName = typeof payload.tool_name === 'string' ? payload.tool_name : ''
  if (event === 'tool_use') {
    return toolName ? `工具调用：${toolName}` : '工具调用'
  }
  if (event === 'tool_result') {
    return toolName ? `工具返回：${toolName}` : '工具返回'
  }
  if (event === 'tool_error') {
    return toolName ? `工具失败：${toolName}` : '工具失败'
  }
  if (event === 'sys_intent_route') {
    return '意图路由'
  }
  if (event === 'sys_tool_plan') {
    return '工具规划'
  }
  if (event === 'sys_rag_force') {
    return '知识库检索'
  }
  if (event === 'risk_alert') {
    return '风险提示'
  }
  return event
}

function eventDisplayDetail(event: string, payload: StreamEventData): string {
  if (event === 'tool_use') {
    return payload.input !== undefined ? `input: ${renderToolPayload(payload.input)}` : ''
  }
  if (event === 'tool_result') {
    return payload.message || renderToolPayload(payload.derived?.sources ?? payload.items ?? payload.output)
  }
  if (event === 'tool_error') {
    return payload.message || payload.code || 'tool error'
  }
  if (event === 'sys_intent_route') {
    const categories = Array.isArray(payload.categories) ? payload.categories.filter(Boolean).join(', ') : ''
    const matchedBy = typeof payload.matched_by === 'string' ? payload.matched_by : ''
    return [categories ? `categories: ${categories}` : '', matchedBy ? `matched_by: ${matchedBy}` : '']
      .filter(Boolean)
      .join('\n')
  }
  return payload.message || payload.reason || renderToolPayload(payload)
}

function eventTagColor(event: string): string {
  if (event === 'tool_error' || event === 'risk_alert') {
    return 'red'
  }
  if (event.startsWith('sys_')) {
    return 'blue'
  }
  return 'geekblue'
}

function toolCallsFromEvents(events: ChatEvent[]): ToolCall[] {
  const calls: ToolCall[] = []
  for (const item of events) {
    const payload = item.payload
    const toolName = typeof payload.tool_name === 'string' ? payload.tool_name : ''
    if (!toolName || !item.event.startsWith('tool_')) {
      continue
    }
    const id = typeof payload.tool_call_id === 'string' && payload.tool_call_id ? payload.tool_call_id : toolName
    const index = calls.findIndex((call) => call.id === id)
    const patch: ToolCall = {
      id,
      toolName,
      input: item.event === 'tool_use' ? payload.input : undefined,
      status: item.event === 'tool_error' ? 'error' : payload.status,
      message: payload.message,
      result: item.event === 'tool_result'
        ? {
            status: payload.status,
            message: payload.message,
            items: payload.items,
            output: payload.output,
            derived: payload.derived,
          }
        : undefined,
    }
    if (index >= 0) {
      calls[index] = { ...calls[index], ...patch, input: patch.input ?? calls[index].input }
    } else {
      calls.push(patch)
    }
  }
  return calls
}

function describeSystemState(event: string, payload: StreamEventData): string {
  const baseMessage = typeof payload.message === 'string' ? payload.message.trim() : ''
  if (event === 'sys_intent_route') {
    const categories = Array.isArray(payload.categories) ? payload.categories.filter(Boolean).join('、') : ''
    const matchedBy = typeof payload.matched_by === 'string' && payload.matched_by ? payload.matched_by : ''
    const categoryText = categories ? `：${categories}` : ''
    const matchedText = matchedBy ? `（${matchedBy}）` : ''
    return `正在路由工具${categoryText}${matchedText}` || baseMessage || '正在路由工具'
  }
  if (event === 'sys_tool_plan') {
    const toolName = typeof payload.tool_name === 'string' && payload.tool_name ? payload.tool_name : ''
    return toolName ? `正在规划工具步骤：${toolName}` : (baseMessage || '正在规划工具步骤')
  }
  if (event === 'reasoning_delta') {
    return '模型正在整理思路'
  }
  return baseMessage || event.replace(/^sys_/, '正在').replace(/_/g, '')
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
          ? (
            <Space size={8}>
              <LoadingOutlined style={{ color: '#2563EB' }} />
              <Text type="secondary">{msg.progressText || '模型思考中，请稍候...'}</Text>
            </Space>
            )
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

        {msg.events?.length
          ? (
            <Collapse
              ghost
              size="small"
              style={{ marginTop: 8 }}
              items={[{
                key: 'events',
                label: (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <FileTextOutlined style={{ marginRight: 4 }} />
                    执行过程 {msg.events.length} 条
                  </Text>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {msg.events.map((item) => {
                      const detail = eventDisplayDetail(item.event, item.payload)
                      return (
                        <div key={item.id} style={{ background: '#F8FAFC', borderRadius: 6, padding: '8px 12px' }}>
                          <Tag color={eventTagColor(item.event)} style={{ fontSize: 11, marginBottom: 4 }}>
                            {eventDisplayTitle(item.event, item.payload)}
                          </Tag>
                          {detail && (
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'pre-wrap' }}>
                              {detail}
                            </Text>
                          )}
                        </div>
                      )
                    })}
                  </Space>
                ),
              }]}
            />
            )
          : null}

        {!msg.events?.length && msg.toolCalls?.length
          ? (
            <Collapse
              ghost
              size="small"
              style={{ marginTop: 8 }}
              items={[{
                key: 'tools',
                label: (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <FileTextOutlined style={{ marginRight: 4 }} />
                    工具调用 {msg.toolCalls.length} 次
                  </Text>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {msg.toolCalls.map((tool) => (
                      <div key={tool.id} style={{ background: '#F8FAFC', borderRadius: 6, padding: '8px 12px' }}>
                        <Tag color={tool.status === 'error' ? 'red' : 'geekblue'} style={{ fontSize: 11, marginBottom: 4 }}>
                          tool_call: {tool.toolName}
                        </Tag>
                        {tool.input !== undefined && (
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'pre-wrap' }}>
                            input: {renderToolPayload(tool.input)}
                          </Text>
                        )}
                        {(tool.message || tool.result) && (
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'pre-wrap' }}>
                            tool_result: {tool.message || renderToolPayload(tool.result?.items ?? tool.result?.output)}
                          </Text>
                        )}
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

function toChatMessage(data: { id: number; role: 'user' | 'assistant'; content: string; sources?: StreamSourceItem[]; events?: StreamEventRecord[] }): ChatMessage {
  const events = normalizeEventRecords(data.events)
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
    events,
    toolCalls: toolCallsFromEvents(events),
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

function isSessionNotFoundError(error: unknown): boolean {
  if (typeof error === 'string') {
    return error.includes('会话不存在')
  }
  if (typeof error !== 'object' || error === null) {
    return false
  }
  const maybe = error as {
    response?: { status?: number; data?: { message?: string } }
    config?: { url?: string }
  }
  const message = maybe.response?.data?.message
  if (typeof message === 'string' && message.includes('会话不存在')) {
    return true
  }
  const status = maybe.response?.status
  const url = maybe.config?.url ?? ''
  if (status === 404 && typeof url === 'string' && /\/chat\/sessions\/\d+\/messages/.test(url)) {
    return true
  }
  return false
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const msgListRef = useRef<HTMLDivElement>(null)
  const messageLoadSeqRef = useRef(0)
  const shouldAutoScrollRef = useRef(true)
  const routeSyncRef = useRef(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? null,
    [sessions, activeId],
  )
  const applyRouteSessionId = (sessionId: number | null) => {
    routeSyncRef.current = true
    if (sessionId == null) {
      setSearchParams({}, { replace: true })
      return
    }
    setSearchParams({ sessionId: String(sessionId) }, { replace: true })
  }

  const reloadSessions = async (preferredSessionId?: number, syncRoute = false): Promise<ChatSession[]> => {
    const response = await chatApi.listSessions()
    const baseSessions: ChatSession[] = (response.data ?? []).map(toChatSession)
    let nextSessions: ChatSession[] = baseSessions
    setSessions((prev) => {
      const messageMap = new Map(prev.map((session) => [session.id, session.messages]))
      nextSessions = baseSessions.map((session) => ({
        ...session,
        messages: messageMap.get(session.id) ?? [],
      }))
      return nextSessions
    })
    const targetId = preferredSessionId ?? Number(searchParams.get('sessionId') ?? '')
    if (nextSessions.length === 0) {
      setActiveId(null)
      if (syncRoute) {
        applyRouteSessionId(null)
      }
      return nextSessions
    }
    const matched = Number.isFinite(targetId) && targetId > 0
      ? nextSessions.find((item) => item.id === targetId)
      : null
    const nextActiveId = matched ? matched.id : nextSessions[0].id
    setActiveId(nextActiveId)
    if (syncRoute) {
      applyRouteSessionId(nextActiveId)
    }
    return nextSessions
  }

  const recoverInvalidSession = async (error: unknown): Promise<boolean> => {
    if (!isSessionNotFoundError(error)) {
      return false
    }
    await reloadSessions(undefined, true)
    emitChatSessionsRefresh()
    globalMessage.error('会话不存在，已自动刷新会话列表')
    return true
  }

  useEffect(() => {
    if (!activeSession) {
      return
    }
    if (!shouldAutoScrollRef.current) {
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [activeSession?.id, activeSession?.messages.length])

  useEffect(() => {
    void (async () => {
      try {
        await reloadSessions()
      } catch (error) {
        globalMessage.error(typeof error === 'string' ? error : '加载会话失败')
      }
    })()
  }, [])

  useEffect(() => {
    const unsubscribe = onChatSessionsRefresh(() => {
      void reloadSessions(activeId ?? undefined)
    })
    return unsubscribe
  }, [activeId])

  useEffect(() => {
    const routeSessionId = Number(searchParams.get('sessionId') ?? '')
    if (routeSyncRef.current) {
      routeSyncRef.current = false
      return
    }
    if (!Number.isFinite(routeSessionId) || routeSessionId <= 0) {
      if (sessions.length > 0 && activeId !== sessions[0].id) {
        shouldAutoScrollRef.current = true
        setActiveId(sessions[0].id)
      }
      return
    }

    const matched = sessions.find((session) => session.id === routeSessionId)
    if (!matched) {
      void reloadSessions(routeSessionId, true)
      return
    }

    if (routeSessionId !== activeId) {
      shouldAutoScrollRef.current = true
      setActiveId(routeSessionId)
    }
  }, [searchParams, activeId, sessions, setSearchParams])

  useEffect(() => {
    if (activeId == null) {
      setMessagesLoading(false)
      return
    }

    setMessagesLoading(true)
    const currentSeq = ++messageLoadSeqRef.current
    void (async () => {
      try {
        const response = await chatApi.listMessages(activeId)
        if (currentSeq !== messageLoadSeqRef.current) {
          return
        }
        const messages = (response.data ?? []).map(toChatMessage)
        setSessions((prev) => prev.map((session) => (
          session.id === activeId
            ? { ...session, messages }
            : session
        )))
      } catch (error) {
        if (currentSeq !== messageLoadSeqRef.current) {
          return
        }
        if (await recoverInvalidSession(error)) {
          return
        }
        globalMessage.error(typeof error === 'string' ? error : '加载消息失败')
      } finally {
        if (currentSeq === messageLoadSeqRef.current) {
          setMessagesLoading(false)
        }
      }
    })()
  }, [activeId])

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

  const upsertToolCall = (sessionId: number, messageId: number, patch: ToolCall) => {
    setSessions((prev) => prev.map((session) => {
      if (session.id !== sessionId) {
        return session
      }
      return {
        ...session,
        messages: session.messages.map((msg) => {
          if (msg.id !== messageId) {
            return msg
          }
          const calls = msg.toolCalls ?? []
          const index = calls.findIndex((item) => item.id === patch.id)
          const nextCalls = index >= 0
            ? calls.map((item) => (item.id === patch.id ? { ...item, ...patch } : item))
            : [...calls, patch]
          return { ...msg, toolCalls: nextCalls }
        }),
      }
    }))
  }

  const appendMessageEvent = (sessionId: number, messageId: number, event: ChatEvent) => {
    setSessions((prev) => prev.map((session) => {
      if (session.id !== sessionId) {
        return session
      }
      return {
        ...session,
        messages: session.messages.map((msg) => {
          if (msg.id !== messageId) {
            return msg
          }
          const events = msg.events ?? []
          return {
            ...msg,
            events: events.some((item) => item.id === event.id) ? events : [...events, event],
          }
        }),
      }
    }))
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
        if (!created?.id) {
          globalMessage.error('创建会话失败，无法发送消息')
          return
        }
        targetSession = toChatSession(created)
        setSessions((prev) => [targetSession!, ...prev])
        setActiveId(targetSession.id)
        applyRouteSessionId(targetSession.id)
      } catch (error) {
        if (await recoverInvalidSession(error)) {
          return
        }
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

    const userMessage: ChatMessage = { id: userMsgId, role: 'user', content: text, streaming: false }
    const assistantPlaceholder: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      streaming: true,
      progressText: '模型思考中，请稍候... (0s)',
    }

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
    shouldAutoScrollRef.current = true
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
          onEvent: ({ event, payload }) => {
            const record = streamEventRecord(event, payload)
            if (record) {
              appendMessageEvent(sessionId, aiMsgId, record)
            }
          },
          onDelta: (chunk) => {
            setSessions((prev) => prev.map((session) => {
              if (session.id !== sessionId) {
                return session
              }
              return {
                ...session,
                messages: session.messages.map((msg) => (
                  msg.id === aiMsgId
                    ? { ...msg, content: `${msg.content}${chunk}`, streaming: true, progressText: undefined }
                    : msg
                )),
              }
            }))
          },
          onReasoningDelta: () => {
            updateAssistantMessage(sessionId, aiMsgId, {
              progressText: '模型正在整理思路...',
            })
          },
          onProgress: (message, elapsedSec) => {
            updateAssistantMessage(sessionId, aiMsgId, {
              progressText: `${message}${typeof elapsedSec === 'number' ? ` (${elapsedSec}s)` : ''}`,
            })
          },
          onSystemEvent: ({ event, payload }) => {
            updateAssistantMessage(sessionId, aiMsgId, {
              progressText: describeSystemState(event, payload),
            })
          },
          onEnd: () => {
            updateAssistantMessage(sessionId, aiMsgId, { streaming: false })
          },
          onToolUse: (data) => {
            upsertToolCall(sessionId, aiMsgId, {
              id: data.toolCallId || data.toolName,
              toolName: data.toolName,
              input: data.input,
            })
            updateAssistantMessage(sessionId, aiMsgId, {
              progressText: data.toolName ? `正在调用工具：${data.toolName}` : '正在调用工具',
            })
          },
          onToolResult: (data) => {
            upsertToolCall(sessionId, aiMsgId, {
              id: data.toolCallId || data.toolName,
              toolName: data.toolName,
              status: data.result.status,
              message: data.result.message,
              result: data.result,
            })
            updateAssistantMessage(sessionId, aiMsgId, {
              progressText: data.toolName ? `工具已返回：${data.toolName}` : '工具已返回',
            })
          },
          onSources: (items, _status, message) => {
            updateAssistantMessage(sessionId, aiMsgId, {
              sources: toDisplaySources(items, message),
            })
          },
          onToolError: (data) => {
            upsertToolCall(sessionId, aiMsgId, {
              id: data.toolCallId || data.toolName,
              toolName: data.toolName,
              status: 'error',
              message: data.message,
            })
            updateAssistantMessage(sessionId, aiMsgId, {
              progressText: data.toolName ? `工具调用失败：${data.toolName}` : '工具调用失败',
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
        let fallbackResp
        try {
          fallbackResp = await chatApi.sendMessage(sessionId, text)
        } catch (fallbackError) {
          if (await recoverInvalidSession(fallbackError)) {
            updateAssistantMessage(sessionId, aiMsgId, {
              streaming: false,
              content: '会话不存在，已自动刷新，请重新发送消息。',
            })
            return
          }
          throw fallbackError
        }
        const fallbackEvents = normalizeEventRecords(fallbackResp.data?.events)
        updateAssistantMessage(sessionId, aiMsgId, {
          streaming: false,
          content: fallbackResp.data?.content ?? (streamError || '请求失败，请稍后重试。'),
          events: fallbackEvents,
          toolCalls: toolCallsFromEvents(fallbackEvents),
        })
      }
    } catch {
      globalMessage.warning('流式失败，已自动降级为非流式请求')
      try {
        const fallbackResp = await chatApi.sendMessage(sessionId, text)
        const fallbackEvents = normalizeEventRecords(fallbackResp.data?.events)
        updateAssistantMessage(sessionId, aiMsgId, {
          streaming: false,
          content: fallbackResp.data?.content ?? '请求失败，请稍后重试。',
          events: fallbackEvents,
          toolCalls: toolCallsFromEvents(fallbackEvents),
        })
      } catch (fallbackError) {
        if (await recoverInvalidSession(fallbackError)) {
          updateAssistantMessage(sessionId, aiMsgId, {
            streaming: false,
            content: '会话不存在，已自动刷新，请重新发送消息。',
          })
          return
        }
        updateAssistantMessage(sessionId, aiMsgId, {
          streaming: false,
          content: typeof fallbackError === 'string' ? `请求失败：${fallbackError}` : '请求失败，请稍后重试。',
        })
      }
    } finally {
      emitChatSessionsRefresh()
      setSending(false)
    }
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {messagesLoading && (!activeSession || activeSession.messages.length === 0)
          ? (
            <div className={styles.emptyChat}>
              <div style={{ width: 'min(780px, 100%)' }}>
                <Skeleton active paragraph={{ rows: 4 }} title={false} />
              </div>
            </div>
            )
          : !activeSession || activeSession.messages.length === 0
          ? (
            <div className={styles.emptyChat}>
              <RobotOutlined style={{ fontSize: 52, color: '#CBD5E1', marginBottom: 16 }} />
              <Title level={4} style={{ color: '#94A3B8', marginBottom: 8 }}>开始和 AI 助手对话</Title>
              <Text type="secondary">输入问题后发送，系统会按流式返回答案。</Text>
            </div>
            )
          : (
            <div
              className={styles.msgList}
              ref={msgListRef}
              onScroll={(event) => {
                const target = event.currentTarget
                const delta = target.scrollHeight - target.scrollTop - target.clientHeight
                shouldAutoScrollRef.current = delta < 80
              }}
            >
              {activeSession.messages.map((msg) => (
                <MsgBubble key={msg.id} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
            )}

        <div className={styles.inputArea}>
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
