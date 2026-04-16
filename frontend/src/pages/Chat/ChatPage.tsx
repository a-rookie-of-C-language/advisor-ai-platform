import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Collapse,
  Empty,
  Input,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  DeleteOutlined,
  FileTextOutlined,
  LoadingOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { chatApi } from '../../api/chatApi'
import { globalMessage } from '../../utils/globalMessage'
import styles from './ChatPage.module.css'

const { Text, Title } = Typography

interface Source {
  id: number
  docName: string
  snippet: string
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

        {!msg.streaming && msg.sources?.length
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
                    参考来源（{msg.sources.length}）
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

function toChatMessage(data: { id: number; role: 'user' | 'assistant'; content: string }): ChatMessage {
  return {
    id: data.id,
    role: data.role,
    content: data.content,
    streaming: false,
  }
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [kbId] = useState<number>(1)
  const bottomRef = useRef<HTMLDivElement>(null)

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
        const nextSessions: ChatSession[] = (response.data ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          updatedAt: item.updatedAt,
          messages: [],
        }))
        setSessions(nextSessions)
        if (nextSessions.length > 0) {
          setActiveId(nextSessions[0].id)
        }
      } catch (error) {
        globalMessage.error(typeof error === 'string' ? error : '加载会话失败')
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

  const handleNewSession = async () => {
    try {
      const response = await chatApi.createSession()
      const created = response.data
      const newSession: ChatSession = {
        id: created.id,
        title: created.title,
        updatedAt: created.updatedAt,
        messages: [],
      }
      setSessions((prev) => [newSession, ...prev])
      setActiveId(newSession.id)
    } catch (error) {
      globalMessage.error(typeof error === 'string' ? error : '创建会话失败')
    }
  }

  const handleDeleteSession = async (id: number) => {
    try {
      await chatApi.deleteSession(id)
      setSessions((prev) => {
        const next = prev.filter((session) => session.id !== id)
        if (activeId === id) {
          setActiveId(next[0]?.id ?? null)
        }
        return next
      })
      globalMessage.success('对话已删除')
    } catch (error) {
      globalMessage.error(typeof error === 'string' ? error : '删除会话失败')
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
        targetSession = {
          id: created.id,
          title: created.title,
          updatedAt: created.updatedAt,
          messages: [],
        }
        setSessions((prev) => [targetSession!, ...prev])
        setActiveId(targetSession.id)
      } catch (error) {
        globalMessage.error(typeof error === 'string' ? error : '创建会话失败，无法发送消息')
        return
      }
    }

    const sessionId = targetSession.id
    const userMsgId = Date.now()
    const aiMsgId = userMsgId + 1

    const userMessage: ChatMessage = { id: userMsgId, role: 'user', content: text, streaming: false }
    const assistantPlaceholder: ChatMessage = { id: aiMsgId, role: 'assistant', content: '', streaming: true }

    const historyMessages = [
      ...targetSession.messages,
      userMessage,
    ].map((msg) => ({ role: msg.role, content: msg.content }))

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
        updatedAt: targetSession!.updatedAt,
        messages: [userMessage, assistantPlaceholder],
      }, ...mapped]
    })

    try {
      await chatApi.streamChat(
        {
          messages: historyMessages,
          sessionId,
          kbId,
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
          onError: (message) => {
            updateAssistantMessage(sessionId, aiMsgId, {
              streaming: false,
              content: message ? `请求失败：${message}` : '请求失败，请稍后重试。',
            })
          },
        },
      )
    } catch (error) {
      updateAssistantMessage(sessionId, aiMsgId, {
        streaming: false,
        content: typeof error === 'string' ? `请求失败：${error}` : '请求失败，请稍后重试。',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Title level={5} style={{ margin: 0, color: '#fff' }}>对话列表</Title>
          <Tooltip title="新建对话">
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={() => void handleNewSession()}
              style={{ color: '#fff' }}
            />
          </Tooltip>
        </div>

        <div className={styles.sessionList}>
          {sessions.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>暂无对话</Text>
            </div>
          )}

          {sessions.map((session) => (
            <div
              key={session.id}
              className={`${styles.sessionItem} ${session.id === activeId ? styles.sessionItemActive : ''}`}
              onClick={() => setActiveId(session.id)}
            >
              <div className={styles.sessionTitle}>{session.title}</div>
              <div className={styles.sessionMeta}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{session.updatedAt}</Text>
                <Popconfirm
                  title="删除该对话？"
                  onConfirm={(event) => {
                    event?.stopPropagation()
                    void handleDeleteSession(session.id)
                  }}
                  onCancel={(event) => event?.stopPropagation()}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    className={styles.deleteBtn}
                    onClick={(event) => event.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className={styles.main}>
        {!activeSession || activeSession.messages.length === 0
          ? (
            <div className={styles.emptyChat}>
              <RobotOutlined style={{ fontSize: 52, color: '#CBD5E1', marginBottom: 16 }} />
              <Title level={4} style={{ color: '#94A3B8', marginBottom: 8 }}>智小理 · AI 助手</Title>
              <Text type="secondary">向 AI 助手提问，它会基于知识库进行回答。</Text>
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
            <Empty description={<span>请先新建或选择一个对话</span>} style={{ marginBottom: 12 }} />
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
