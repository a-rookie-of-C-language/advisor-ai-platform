import { describe, expect, it } from 'vitest'
import {
  describeSystemState,
  eventDisplayDetail,
  normalizeEventRecords,
  renderToolResultSummary,
  toolCallsFromEvents,
} from './chatMessageModel'

describe('chatMessageModel', () => {
  it('normalizes persisted events and derives tool calls', () => {
    const events = normalizeEventRecords([
      {
        event: 'tool_use',
        timestamp: 1,
        payload: { tool_name: 'web_search', tool_call_id: 'call-1', input: { q: '招生' } },
      },
      {
        event: 'tool_result',
        timestamp: 2,
        payload: {
          tool_name: 'web_search',
          tool_call_id: 'call-1',
          status: 'ok',
          output: { summary: '找到相关材料' },
        },
      },
      { event: 'debug_only', payload: { message: 'ignore me' } },
    ])

    expect(events).toHaveLength(2)
    expect(events[0].id).toBe('tool_use:call-1')
    expect(toolCallsFromEvents(events)).toEqual([
      {
        id: 'call-1',
        toolName: 'web_search',
        input: { q: '招生' },
        status: 'ok',
        message: undefined,
        result: {
          status: 'ok',
          message: undefined,
          items: undefined,
          output: { summary: '找到相关材料' },
          derived: undefined,
        },
      },
    ])
  })

  it('renders event details and system progress text', () => {
    expect(renderToolResultSummary('web_search', { output: { summary: '摘要' } })).toBe('摘要')
    expect(eventDisplayDetail('tool_error', { message: '超时' })).toBe('超时')
    expect(describeSystemState('sys_intent_route', { categories: ['rag'], matched_by: 'rule' }))
      .toBe('正在路由工具：rag（matched_by：rule）')
  })
})
