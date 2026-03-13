/**
 * SSE (Server-Sent Events) utilities for API routes
 *
 * Provides reusable helpers for streaming responses to clients
 * via Server-Sent Events protocol.
 */

export interface SSEStream {
  readable: ReadableStream
  send: (data: Record<string, unknown>) => Promise<void>
  close: () => Promise<void>
}

/**
 * Creates a Server-Sent Events stream with utilities for sending data
 *
 * @returns Object containing readable stream, send function, and close function
 *
 * @example
 * ```ts
 * const { readable, send, close } = createSSEStream()
 *
 * ;(async () => {
 *   try {
 *     await send({ type: 'status', message: 'Processing...' })
 *     await send({ type: 'done' })
 *   } finally {
 *     await close()
 *   }
 * })()
 *
 * return createSSEResponse(readable)
 * ```
 */
export function createSSEStream(): SSEStream {
  const encoder = new TextEncoder()
  const transform = new TransformStream()
  const writer = transform.writable.getWriter()

  const send = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  const close = async () => {
    await writer.close()
  }

  return {
    readable: transform.readable,
    send,
    close,
  }
}

/**
 * Creates a Response object configured for Server-Sent Events
 *
 * @param readable - ReadableStream from createSSEStream()
 * @returns Response object with SSE headers
 *
 * @example
 * ```ts
 * const { readable } = createSSEStream()
 * return createSSEResponse(readable)
 * ```
 */
export function createSSEResponse(readable: ReadableStream): Response {
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
