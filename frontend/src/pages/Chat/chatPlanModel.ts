import type { StreamEventData } from '../../api/chatApi'
import type { ChatEvent, ChatMessage, PlanStep } from './chatTypes'

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
