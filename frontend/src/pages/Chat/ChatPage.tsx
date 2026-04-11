import { useState, useRef, useEffect } from 'react'
import {
  Button,
  Input,
  Typography,
  Tooltip,
  Popconfirm,
  Empty,
  Collapse,
  Tag,
  Space,
  message,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  FileTextOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import styles from './ChatPage.module.css'

const { Text, Title } = Typography

// ───── 类型定义 ─────
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

// ───── Mock 会话数据 ─────
const MOCK_SESSIONS: ChatSession[] = [
  {
    id: 1,
    title: '心理危机干预方法',
    updatedAt: '10分钟前',
    messages: [
      { id: 1, role: 'user', content: '如何处理学生心理危机事件？' },
      {
        id: 2, role: 'assistant',
        content: '处理学生心理危机事件需要遵循以下步骤：\n\n1. **立即响应**：第一时间联系当事学生，确认其安全状态。\n2. **评估风险**：判断危机的严重程度，是否存在自伤/伤他风险。\n3. **建立信任**：保持冷静、接纳的态度，耐心倾听。\n4. **联络专业支持**：涉及严重情况时，及时联系心理健康中心或医疗机构。\n5. **后续跟进**：危机结束后定期回访，建立支持网络。',
        sources: [
          { id: 1, docName: '心理健康指导手册.pdf', snippet: '心理危机干预的核心原则：及时性、专业性、保密性……' },
          { id: 2, docName: '学生危机处理规范.docx', snippet: '发现学生有自伤迹象时，应立即启动应急预案……' },
        ],
      },
    ],
  },
  {
    id: 2,
    title: '课程思政元素融入',
    updatedAt: '1小时前',
    messages: [
      { id: 1, role: 'user', content: '课程思政元素融入方法？' },
      { id: 2, role: 'assistant', content: '课程思政可以从以下几个维度融入：\n\n- **价值引领**：结合课程内容挖掘爱国主义、工匠精神等思政元素\n- **案例驱动**：引入真实情境，以红色经典案例激发学生认同\n- **实践育人**：通过社会实践、志愿服务等方式内化价值观' },
    ],
  },
]

// ───── Mock AI 流式回答 ─────
const MOCK_AI_ANSWERS = [
  '好的，根据知识库中的相关资料，我来为您详细解答：\n\n**关于您的问题**，综合多份文档的内容，主要可以从以下几个方面来理解：\n\n1. **背景原因**：该问题的产生与当前高校学生工作的新形势密切相关。\n2. **处理原则**：坚持以学生为本，注重人文关怀与规则约束相结合。\n3. **实操建议**：建议记录详细情况，形成案例存档，供后续参考。\n\n如需进一步了解某一具体方面，欢迎继续提问。',
  '根据知识库检索结果，我找到了以下相关信息：\n\n> 相关政策明确要求辅导员应及时响应学生需求，建立健全帮扶机制。\n\n具体操作流程如下：\n- 收集信息，了解学生实际情况\n- 制定个性化支持方案\n- 定期跟踪评估效果\n\n**注意**：请结合学校实际规定执行。',
]

let answerIndex = 0

function getMockAnswer(): { content: string; sources: Source[] } {
  const content = MOCK_AI_ANSWERS[answerIndex % MOCK_AI_ANSWERS.length]
  answerIndex++
  return {
    content,
    sources: [
      { id: 1, docName: '思政工作指导意见.pdf', snippet: '辅导员应当定期开展学情研判，及时发现并解决学生的实际困难……' },
      { id: 2, docName: '学生工作规范手册.docx', snippet: '建立健全学生档案，记录学生成长轨迹及关键事件……' },
    ],
  }
}

// ───── 消息气泡 ─────
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
          : <div className={styles.avatarAI}><RobotOutlined /></div>
        }
      </div>
      <div className={`${styles.msgBubble} ${isUser ? styles.bubbleUser : styles.bubbleAI}`}>
        {msg.streaming && !msg.content
          ? <LoadingOutlined style={{ color: '#2563EB' }} />
          : isUser
            ? <Text>{msg.content}</Text>
            : <div className={styles.markdownBody}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {msg.streaming && <span className={styles.cursor} />}
            </div>
        }
        {!msg.streaming && msg.sources?.length ? (
          <Collapse
            ghost
            size="small"
            style={{ marginTop: 8 }}
            items={[{
              key: '1',
              label: <Text type="secondary" style={{ fontSize: 12 }}><FileTextOutlined style={{ marginRight: 4 }} />参考来源（{msg.sources.length}）</Text>,
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {msg.sources.map((s) => (
                    <div key={s.id} style={{ background: '#F1F5F9', borderRadius: 6, padding: '8px 12px' }}>
                      <Tag color="blue" style={{ fontSize: 11, marginBottom: 4 }}>{s.docName}</Tag>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{s.snippet}</Text>
                    </div>
                  ))}
                </Space>
              ),
            }]}
          />
        ) : null}
      </div>
    </div>
  )
}

// ───── 主页面 ─────
export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(MOCK_SESSIONS)
  const [activeId, setActiveId] = useState<number>(MOCK_SESSIONS[0].id)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeSession = sessions.find((s) => s.id === activeId) ?? null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages])

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now(),
      title: '新对话',
      updatedAt: '刚刚',
      messages: [],
    }
    setSessions((prev) => [newSession, ...prev])
    setActiveId(newSession.id)
  }

  const handleDeleteSession = (id: number) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (id === activeId) {
      const remaining = sessions.filter((s) => s.id !== id)
      setActiveId(remaining[0]?.id ?? -1)
    }
    message.success('对话已删除')
  }

  const handleSend = () => {
    if (!inputText.trim() || sending) return
    if (!activeSession) { message.warning('请先选择或新建一个对话'); return }

    const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: inputText.trim() }
    const aiMsgId = Date.now() + 1
    const aiMsgPlaceholder: ChatMessage = { id: aiMsgId, role: 'assistant', content: '', streaming: true }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? { ...s, title: s.messages.length === 0 ? inputText.trim().slice(0, 20) : s.title, messages: [...s.messages, userMsg, aiMsgPlaceholder] }
          : s
      )
    )
    setInputText('')
    setSending(true)

    // 模拟流式输出
    const { content, sources } = getMockAnswer()
    let charIndex = 0
    const timer = setInterval(() => {
      charIndex += 3
      const chunk = content.slice(0, charIndex)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? { ...s, messages: s.messages.map((m) => m.id === aiMsgId ? { ...m, content: chunk, streaming: charIndex < content.length } : m) }
            : s
        )
      )
      if (charIndex >= content.length) {
        clearInterval(timer)
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeId
              ? { ...s, messages: s.messages.map((m) => m.id === aiMsgId ? { ...m, content, streaming: false, sources } : m) }
              : s
          )
        )
        setSending(false)
      }
    }, 30)
  }

  return (
    <div className={styles.container}>
      {/* ── 左侧会话列表 ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Title level={5} style={{ margin: 0, color: '#fff' }}>对话列表</Title>
          <Tooltip title="新建对话">
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={handleNewSession}
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
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`${styles.sessionItem} ${s.id === activeId ? styles.sessionItemActive : ''}`}
              onClick={() => setActiveId(s.id)}
            >
              <div className={styles.sessionTitle}>{s.title}</div>
              <div className={styles.sessionMeta}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{s.updatedAt}</Text>
                <Popconfirm
                  title="删除该对话？"
                  onConfirm={(e) => { e?.stopPropagation(); handleDeleteSession(s.id) }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    className={styles.deleteBtn}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── 右侧对话区 ── */}
      <main className={styles.main}>
        {!activeSession || activeSession.messages.length === 0 ? (
          <div className={styles.emptyChat}>
            <RobotOutlined style={{ fontSize: 52, color: '#CBD5E1', marginBottom: 16 }} />
            <Title level={4} style={{ color: '#94A3B8', marginBottom: 8 }}>智小理 · AI 助手</Title>
            <Text type="secondary">向 AI 助手提问，它将基于知识库为您作答</Text>
          </div>
        ) : (
          <div className={styles.msgList}>
            {activeSession.messages.map((msg) => (
              <MsgBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* 输入区 */}
        <div className={styles.inputArea}>
          {!activeSession && (
            <Empty description={<span>请先新建或选择一个对话</span>} style={{ marginBottom: 12 }} />
          )}
          <div className={styles.inputRow}>
            <Input.TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入问题，按 Ctrl+Enter 发送…"
              autoSize={{ minRows: 1, maxRows: 5 }}
              disabled={!activeSession || sending}
              onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleSend() }}
              style={{ borderRadius: 8, resize: 'none', flex: 1 }}
            />
            <Button
              type="primary"
              icon={sending ? <LoadingOutlined /> : <SendOutlined />}
              disabled={!inputText.trim() || !activeSession}
              onClick={handleSend}
              style={{ height: 40, paddingInline: 20, borderRadius: 8 }}
            >
              发送
            </Button>
          </div>
          <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block', textAlign: 'center' }}>
            AI 回答基于知识库内容生成，仅供参考，请结合实际判断
          </Text>
        </div>
      </main>
    </div>
  )
}
