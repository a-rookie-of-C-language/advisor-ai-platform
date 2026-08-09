import type { StreamEventData } from '../../api/chatApi'
import { planStepsFromPayload } from './chatPlanModel'
import { renderToolPayload, renderToolResultSummary } from './chatToolRenderModel'

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
