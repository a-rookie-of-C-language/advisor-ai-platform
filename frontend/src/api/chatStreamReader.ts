import { dispatchStreamEvent, parseSseBlock, parseStreamData } from './chatStreamEvents'
import type { StreamHandlers } from './chatStreamTypes'

interface ChatStreamReaderHooks {
  onFirstEvent: () => void
  onStreamActivity: () => void
}

export async function readChatStreamBody(
  body: ReadableStream<Uint8Array>,
  handlers: StreamHandlers,
  hooks: ChatStreamReaderHooks,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let sawAnyEvent = false
  let sawDone = false
  let sawError = false
  let sawDelta = false
  let latestError = ''
  let doneReason = ''
  let streamClosed = false

  while (!streamClosed) {
    const { done, value } = await reader.read()
    if (done) {
      streamClosed = true
      break
    }

    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r/g, '')

    let splitIndex = buffer.indexOf('\n\n')
    while (splitIndex >= 0) {
      const rawBlock = buffer.slice(0, splitIndex)
      buffer = buffer.slice(splitIndex + 2)

      const parsed = parseSseBlock(rawBlock)
      if (parsed) {
        if (!sawAnyEvent) {
          sawAnyEvent = true
          hooks.onFirstEvent()
        }
        hooks.onStreamActivity()

        const data = parseStreamData(parsed.data)
        handlers.onEvent?.({ event: parsed.event, payload: data })

        if (parsed.event === 'sys_error') {
          sawError = true
          latestError = data.message ?? 'stream error'
        }
        if (parsed.event === 'llm_delta' || parsed.event === 'llm_data') {
          sawDelta = sawDelta || Boolean(data.text)
        }
        if (parsed.event === 'sys_done') {
          sawDone = true
          doneReason = data.finish_reason ?? parsed.event
          if (!sawDelta) {
            sawError = true
            latestError = 'stream done without delta'
            handlers.onError?.(latestError)
            throw new Error(latestError)
          }
        }

        const shouldReturn = dispatchStreamEvent(parsed.event, data, handlers, () => {
          void reader.cancel()
        })
        if (shouldReturn) {
          return
        }
      }

      splitIndex = buffer.indexOf('\n\n')
    }
  }

  if (sawDone) {
    return
  }

  if (sawError) {
    throw new Error(latestError || 'stream_error_without_done')
  }

  throw new Error(doneReason ? `stream_closed_without_done:${doneReason}` : 'stream_closed_without_done')
}
