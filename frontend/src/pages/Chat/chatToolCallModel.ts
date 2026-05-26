import type { ChatEvent, ToolCall } from './chatTypes'

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
