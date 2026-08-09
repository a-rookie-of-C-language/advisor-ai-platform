import type {
  StreamEventData,
  StreamEventRecord,
} from '../../api/chatApi'
import type { ChatEvent } from './chatTypes'

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
