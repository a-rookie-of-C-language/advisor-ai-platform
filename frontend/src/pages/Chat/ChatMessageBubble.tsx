import { type ReactNode } from 'react'
import { Collapse, Space, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  LoadingOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import {
  type ChatMessage,
  eventDisplayDetail,
  eventDisplayTitle,
  eventTagColor,
  planStepStatus,
  planStepTitle,
  planStepsFromPayload,
  reasoningEventsFromMessage,
  reasoningStageLabel,
  renderToolPayload,
  renderToolResultSummary,
  taskPlanFromEvents,
} from './chatMessageModel'
import styles from './ChatPage.module.css'

const { Text } = Typography

interface MsgBubbleProps {
  msg: ChatMessage
}

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

function planStepStatusMeta(status: ReturnType<typeof planStepStatus>): {
  label: string
  color: string
  icon: ReactNode
} {
  if (status === 'done') {
    return { label: '已完成', color: 'green', icon: <CheckCircleOutlined /> }
  }
  if (status === 'running') {
    return { label: '进行中', color: 'blue', icon: <LoadingOutlined /> }
  }
  if (status === 'error') {
    return { label: '失败', color: 'red', icon: <ExclamationCircleOutlined /> }
  }
  return { label: '待执行', color: 'default', icon: <ClockCircleOutlined /> }
}

function ReasoningTrace({ msg }: MsgBubbleProps) {
  const reasoningEvents = reasoningEventsFromMessage(msg.events)
  if (!reasoningEvents.length || msg.role !== 'assistant') {
    return null
  }

  return (
    <div className={styles.reasoningTrace}>
      <Text type="secondary" className={styles.reasoningTraceTitle}>
        执行思路
      </Text>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {reasoningEvents.map((item) => {
          const payload = item.payload
          const stage = typeof payload.stage === 'string' ? payload.stage : ''
          const agentName = typeof payload.agent_name === 'string' ? payload.agent_name : ''
          return (
            <div key={item.id} className={styles.reasoningTraceItem}>
              <div className={styles.reasoningTraceMeta}>
                <Tag color="blue" style={{ fontSize: 11, marginBottom: 0 }}>
                  {reasoningStageLabel(stage)}
                </Tag>
                {agentName && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {agentName}
                  </Text>
                )}
              </div>
              <Text type="secondary" className={styles.reasoningTraceText}>
                {eventDisplayDetail(item.event, payload)}
              </Text>
            </div>
          )
        })}
      </Space>
    </div>
  )
}

function TaskPlanChecklist({ msg }: MsgBubbleProps) {
  const plan = taskPlanFromEvents(msg.events)
  const steps = planStepsFromPayload(plan)
  if (!plan || steps.length === 0 || msg.role !== 'assistant') {
    return null
  }
  const requiredTools = Array.isArray(plan.required_tools) ? plan.required_tools.filter(Boolean) : []

  return (
    <div className={styles.taskPlan}>
      <div className={styles.taskPlanHeader}>
        <div>
          <Text strong>待办清单</Text>
          {plan.goal && (
            <Text type="secondary" className={styles.taskPlanGoal}>
              {plan.goal}
            </Text>
          )}
        </div>
        {plan.mode && <Tag color="blue">{plan.mode}</Tag>}
      </div>
      {plan.summary && (
        <Text type="secondary" className={styles.taskPlanSummary}>
          {plan.summary}
        </Text>
      )}
      {requiredTools.length > 0 && (
        <div className={styles.taskPlanTools}>
          {requiredTools.map((tool) => <Tag key={tool} color="geekblue">{tool}</Tag>)}
        </div>
      )}
      <div className={styles.taskPlanSteps}>
        {steps.map((step, index) => {
          const status = planStepStatus(step, msg)
          const meta = planStepStatusMeta(status)
          return (
            <div
              key={`${step.action ?? 'step'}:${step.tool_name ?? index}:${index}`}
              className={`${styles.taskPlanStep} ${status === 'done' ? styles.taskPlanStepDone : ''}`}
            >
              <div className={styles.taskPlanStepMain}>
                <Tag color={meta.color} icon={meta.icon} className={styles.taskPlanStatus}>
                  {meta.label}
                </Tag>
                <Text strong delete={status === 'done'}>{planStepTitle(step, index)}</Text>
              </div>
              {(step.reason || step.expected_outcome || step.summary) && (
                <Text type="secondary" className={styles.taskPlanStepDetail}>
                  {step.reason || step.summary}
                  {step.expected_outcome ? `；预期：${step.expected_outcome}` : ''}
                </Text>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MsgBubble({ msg }: MsgBubbleProps) {
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

        {!isUser && <ReasoningTrace msg={msg} />}
        {!isUser && <TaskPlanChecklist msg={msg} />}

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
                            tool_result: {renderToolResultSummary(tool.toolName, tool.result)}
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
