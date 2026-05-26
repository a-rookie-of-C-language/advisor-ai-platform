import type { StreamEventData } from '../../api/chatApi'

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

export function eventTagColor(event: string): string {
  if (event === 'tool_error' || event === 'risk_alert') {
    return 'red'
  }
  if (event.startsWith('sys_')) {
    return 'blue'
  }
  return 'geekblue'
}
