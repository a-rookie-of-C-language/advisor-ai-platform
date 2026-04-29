import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Collapse, Empty, Input, Select, Space, Tag, Typography } from 'antd'
import {
  FileTextOutlined,
  LoadingOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { useSearchParams } from 'react-router-dom'
import { chatApi, type ChatSessionDTO, type StreamSourceItem } from '../../api/chatApi'
import { ragApi, type KnowledgeBaseDTO } from '../../api/ragApi'
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

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseDTO[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
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
    if (!text || sending) {
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

    const userMessage: ChatMessage = { id: userMsgId, role: 'user', content: text, streaming: false }
    const assistantPlaceholder: ChatMessage = { id: aiMsgId, role: 'assistant', content: '', streaming: true }

    const historyMessages = [
      ...targetSession.messages,
      userMessage,
    ]
      .map((msg) => ({ role: msg.role, content: msg.content.trim() }))
      .filter((msg) => msg.content.length > 0)

    setInputText('')
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
