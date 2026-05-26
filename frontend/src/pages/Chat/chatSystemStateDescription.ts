import type { StreamEventData } from '../../api/chatApi'

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
