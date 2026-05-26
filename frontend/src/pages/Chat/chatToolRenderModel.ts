import type { StreamToolResult } from '../../api/chatApi'

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
