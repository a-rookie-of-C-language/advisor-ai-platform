import { describe, expect, it, vi } from 'vitest'
import { dispatchStreamEvent, parseSseBlock, parseStreamData } from './chatStreamEvents'
import type { StreamHandlers } from './chatStreamTypes'

describe('chatStreamEvents', () => {
  it('parses SSE blocks with explicit event and multiline data', () => {
    const parsed = parseSseBlock('event: llm_delta\ndata: hello\ndata: world\n')

    expect(parsed).toEqual({ event: 'llm_delta', data: 'hello\nworld' })
  })

  it('unwraps nested stream payloads', () => {
    const data = parseStreamData('{"payload":{"message":"ok"}}')

    expect(data.message).toBe('ok')
  })

  it('normalizes risk alert payload before dispatching', () => {
    const handlers: StreamHandlers = {
      onRiskAlert: vi.fn(),
    }

    dispatchStreamEvent(
      'risk_alert',
      { code: '403', message: 'blocked', category: 'prompt_injection' },
      handlers,
      vi.fn(),
    )

    expect(handlers.onRiskAlert).toHaveBeenCalledWith({
      code: 403,
      message: 'blocked',
      category: 'prompt_injection',
    })
  })
})
