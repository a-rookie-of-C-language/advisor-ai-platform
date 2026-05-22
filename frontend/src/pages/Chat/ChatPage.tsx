import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Collapse, Input, Skeleton, Space, Tag, Typography } from 'antd'
import {
  FileTextOutlined,
  LoadingOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { useSearchParams } from 'react-router-dom'
import { chatApi, type ChatSessionDTO, type StreamSourceItem, type StreamToolResult } from '../../api/chatApi'
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

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  toolCalls?: ToolCall[]
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

function renderToolPayload(value: unknown): string {
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
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

        {msg.toolCalls?.length
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

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || sending) {
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
      .map((msg) => ({ role: msg.role, content: msg.content.trim() }))
      .filter((msg) => msg.content.length > 0)

    setInputText('')
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
                    ? { ...msg, content: `${msg.content}${chunk}`, streaming: true, progressText: undefined }
                    : msg
                )),
              }
            }))
          },
          onProgress: (message, elapsedSec) => {
            updateAssistantMessage(sessionId, aiMsgId, {
              progressText: `${message}${typeof elapsedSec === 'number' ? ` (${elapsedSec}s)` : ''}`,
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
          },
          onToolResult: (data) => {
            upsertToolCall(sessionId, aiMsgId, {
              id: data.toolCallId || data.toolName,
              toolName: data.toolName,
              status: data.result.status,
              message: data.result.message,
              result: data.result,
            })
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
              disabled={!inputText.trim() || sending}
              onClick={() => void handleSend()}
              style={{ height: 40, paddingInline: 20, borderRadius: 8 }}
            >
              发送
            </Button>
          </div>

          <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block', textAlign: 'center' }}>
            AI 回答仅供参考，请结合实际情况进行判断。
          </Text>
        </div>
      </main>
    </div>
  )
}
