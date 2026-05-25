import type {
  ChatSessionDTO,
  StreamEventData,
  StreamEventRecord,
  StreamSourceItem,
  StreamToolResult,
} from '../../api/chatApi'
import type { WorkspaceFileDTO } from '../../api/workspaceApi'

export interface Source {
  id: number
  docName: string
  snippet: string
  score?: number
}

export interface ToolCall {
  id: string
  toolName: string
  input?: unknown
  status?: string
  message?: string
  result?: StreamToolResult
}

export interface ChatEvent {
  id: string
  event: string
  payload: StreamEventData
  source?: string
  traceId?: string
  timestamp?: number
}

export interface PlanStep {
  action?: string
  tool_name?: string
  arguments?: unknown
  reason?: string
  expected_outcome?: string
  sufficient?: boolean
  summary?: string
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  attachments?: WorkspaceFileDTO[]
  sources?: Source[]
  toolCalls?: ToolCall[]
  events?: ChatEvent[]
  streaming?: boolean
  progressText?: string
}

export interface ChatSession {
  id: number
  title: string
  updatedAt: string
  kbId: number
  messages: ChatMessage[]
}

export function renderToolPayload(payload: unknown): string {
  if (payload == null) {
    return ''
  }
  if (typeof payload === 'string') {
    return payload
  }
  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return String(payload)
  }
}

export function renderToolResultSummary(toolName: string, result?: StreamToolResult): string {
  if (!result) {
    return ''
  }
  if (toolName === 'web_search') {
    const output = result.output
    if (output && typeof output === 'object') {
      const summary = (output as { summary?: unknown }).summary
      if (typeof summary === 'string' && summary.trim()) {
        return summary
      }
    }
  }
  return result.message || renderToolPayload(result.derived?.sources ?? result.items ?? result.output)
}

export function taskPlanFromEvents(events?: ChatEvent[]): StreamEventData | null {
  const plans = (events ?? []).filter((item) => item.event === 'sys_tool_plan')
  return plans.length ? plans[plans.length - 1].payload : null
}

export function reasoningEventsFromMessage(events?: ChatEvent[]): ChatEvent[] {
  return (events ?? []).filter((item) => item.event === 'sys_reasoning')
}

export function reasoningStageLabel(stage?: string): string {
  if (stage === 'route') {
    return '路由'
  }
  if (stage === 'delegate') {
    return '委托'
  }
  if (stage === 'plan') {
    return '计划'
  }
  return stage || '思路'
}

export function planStepsFromPayload(payload?: StreamEventData | null): PlanStep[] {
  return Array.isArray(payload?.steps) ? payload.steps : []
}

export function planStepTitle(step: PlanStep, index: number): string {
  const action = step.action ?? ''
  const toolName = step.tool_name ?? ''
  if (action === 'call_tool' && toolName) {
    return `${index + 1}. 调用 ${toolName}`
  }
  if (action === 'final') {
    return `${index + 1}. 生成最终回答`
  }
  return `${index + 1}. 执行计划步骤`
}

export function planStepStatus(
  step: PlanStep,
  msg: ChatMessage,
): 'pending' | 'running' | 'done' | 'error' {
  if (step.action === 'final') {
    if (!msg.streaming && msg.content.trim()) {
      return 'done'
    }
    return msg.content.trim() ? 'running' : 'pending'
  }
  const toolName = step.tool_name ?? ''
  if (!toolName) {
    return 'pending'
  }
  const calls = msg.toolCalls ?? []
  const matched = calls.find((item) => item.toolName === toolName)
  if (!matched) {
    return 'pending'
  }
  if (matched.status === 'error') {
    return 'error'
  }
  if (matched.result || matched.status) {
    return 'done'
  }
  return 'running'
}

const PERSISTABLE_EVENTS = new Set([
  'tool_use',
  'tool_result',
  'tool_error',
  'sys_intent_route',
  'sys_tool_plan',
  'sys_reasoning',
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

export function normalizeEventRecords(records?: StreamEventRecord[]): ChatEvent[] {
  return (records ?? [])
    .map(normalizeEventRecord)
    .filter((item): item is ChatEvent => item !== null)
}

export function streamEventRecord(event: string, payload: StreamEventData): ChatEvent | null {
  if (!isPersistableEvent(event)) {
    return null
  }
  return {
    id: eventRecordId(event, payload, `${Date.now()}:${Math.random().toString(16).slice(2)}`),
    event,
    payload,
  }
}

export function eventDisplayTitle(event: string, payload: StreamEventData): string {
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
  if (event === 'sys_reasoning') {
    return '执行思路'
  }
  if (event === 'sys_rag_force') {
    return '知识库检索'
  }
  if (event === 'risk_alert') {
    return '风险提示'
  }
  return event
}

export function eventDisplayDetail(event: string, payload: StreamEventData): string {
  if (event === 'tool_use') {
    return payload.input !== undefined ? `input: ${renderToolPayload(payload.input)}` : ''
  }
  if (event === 'tool_result') {
    return renderToolResultSummary(payload.tool_name ?? '', {
      status: payload.status,
      message: payload.message,
      items: payload.items,
      output: payload.output,
      derived: payload.derived,
    })
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
  if (event === 'sys_tool_plan') {
    const steps = planStepsFromPayload(payload)
    return [
      payload.goal ? `目标: ${payload.goal}` : '',
      payload.summary ? `说明: ${payload.summary}` : '',
      steps.length ? `待办: ${steps.length} 步` : '',
    ].filter(Boolean).join('\n')
  }
  if (event === 'sys_reasoning') {
    return payload.message || payload.reason || renderToolPayload(payload)
  }
  return payload.message || payload.reason || renderToolPayload(payload)
}

export function eventTagColor(event: string): string {
  if (event === 'tool_error' || event === 'risk_alert') {
    return 'red'
  }
  if (event.startsWith('sys_')) {
    return 'blue'
  }
  return 'geekblue'
}

export function toolCallsFromEvents(events: ChatEvent[]): ToolCall[] {
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

export function describeSystemState(event: string, payload: StreamEventData): string {
  const baseMessage = typeof payload.message === 'string' ? payload.message.trim() : ''
  if (event === 'sys_intent_route') {
    const categories = Array.isArray(payload.categories) ? payload.categories.filter(Boolean).join('、') : ''
    const matchedBy = typeof payload.matched_by === 'string' && payload.matched_by ? payload.matched_by : ''
    const categoryText = categories ? `：${categories}` : ''
    const matchedText = matchedBy ? `（matched_by：${matchedBy}）` : ''
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

export function toChatMessage(data: {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: StreamSourceItem[]
  events?: StreamEventRecord[]
}): ChatMessage {
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

export function toChatSession(data: ChatSessionDTO): ChatSession {
  return {
    id: data.id,
    title: data.title,
    updatedAt: data.updatedAt,
    kbId: data.kbId ?? 0,
    messages: [],
  }
}

export function isSessionNotFoundError(error: unknown): boolean {
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
