import { describe, it, expect } from 'bun:test'
import { createSSEStream, createSSEResponse } from '../api-utils'

describe('createSSEStream', () => {
  it('creates stream with readable, send, and close functions', () => {
    const stream = createSSEStream()

    expect(stream.readable).toBeDefined()
    expect(stream.readable).toBeInstanceOf(ReadableStream)
    expect(typeof stream.send).toBe('function')
    expect(typeof stream.close).toBe('function')
  })

  it('sends data in SSE format', async () => {
    const stream = createSSEStream()
    const decoder = new TextDecoder()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const chunks: string[] = []
      let result = await reader.read()
      while (!result.done) {
        chunks.push(decoder.decode(result.value))
        result = await reader.read()
      }
      return chunks.join('')
    })()

    await stream.send({ type: 'test', message: 'hello' })
    await stream.close()

    const text = await readPromise
    expect(text).toBe('data: {"type":"test","message":"hello"}\n\n')
  })

  it('sends multiple data objects sequentially', async () => {
    const stream = createSSEStream()
    const decoder = new TextDecoder()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const chunks: string[] = []
      let result = await reader.read()
      while (!result.done) {
        chunks.push(decoder.decode(result.value))
        result = await reader.read()
      }
      return chunks.join('')
    })()

    await stream.send({ type: 'status', message: 'Processing...' })
    await stream.send({ type: 'progress', percent: 50 })
    await stream.send({ type: 'done' })
    await stream.close()

    const combined = await readPromise
    expect(combined).toContain('data: {"type":"status","message":"Processing..."}\n\n')
    expect(combined).toContain('data: {"type":"progress","percent":50}\n\n')
    expect(combined).toContain('data: {"type":"done"}\n\n')
  })

  it('handles empty object', async () => {
    const stream = createSSEStream()
    const decoder = new TextDecoder()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const chunks: string[] = []
      let result = await reader.read()
      while (!result.done) {
        chunks.push(decoder.decode(result.value))
        result = await reader.read()
      }
      return chunks.join('')
    })()

    await stream.send({})
    await stream.close()

    const text = await readPromise
    expect(text).toBe('data: {}\n\n')
  })

  it('handles nested objects', async () => {
    const stream = createSSEStream()
    const decoder = new TextDecoder()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const chunks: string[] = []
      let result = await reader.read()
      while (!result.done) {
        chunks.push(decoder.decode(result.value))
        result = await reader.read()
      }
      return chunks.join('')
    })()

    await stream.send({
      type: 'result',
      data: {
        nested: {
          value: 123
        }
      }
    })
    await stream.close()

    const text = await readPromise
    expect(text).toBe('data: {"type":"result","data":{"nested":{"value":123}}}\n\n')
  })

  it('handles arrays in data', async () => {
    const stream = createSSEStream()
    const decoder = new TextDecoder()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const chunks: string[] = []
      let result = await reader.read()
      while (!result.done) {
        chunks.push(decoder.decode(result.value))
        result = await reader.read()
      }
      return chunks.join('')
    })()

    await stream.send({ items: [1, 2, 3], tags: ['a', 'b'] })
    await stream.close()

    const text = await readPromise
    expect(text).toBe('data: {"items":[1,2,3],"tags":["a","b"]}\n\n')
  })

  it('handles null and undefined values', async () => {
    const stream = createSSEStream()
    const decoder = new TextDecoder()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const chunks: string[] = []
      let result = await reader.read()
      while (!result.done) {
        chunks.push(decoder.decode(result.value))
        result = await reader.read()
      }
      return chunks.join('')
    })()

    await stream.send({ nullable: null, notDefined: undefined })
    await stream.close()

    const text = await readPromise
    expect(text).toBe('data: {"nullable":null}\n\n')
  })

  it('handles boolean and number values', async () => {
    const stream = createSSEStream()
    const decoder = new TextDecoder()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const chunks: string[] = []
      let result = await reader.read()
      while (!result.done) {
        chunks.push(decoder.decode(result.value))
        result = await reader.read()
      }
      return chunks.join('')
    })()

    await stream.send({
      isActive: true,
      count: 42,
      ratio: 3.14,
      disabled: false
    })
    await stream.close()

    const text = await readPromise
    expect(text).toBe('data: {"isActive":true,"count":42,"ratio":3.14,"disabled":false}\n\n')
  })

  it('handles special characters in strings', async () => {
    const stream = createSSEStream()
    const decoder = new TextDecoder()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const chunks: string[] = []
      let result = await reader.read()
      while (!result.done) {
        chunks.push(decoder.decode(result.value))
        result = await reader.read()
      }
      return chunks.join('')
    })()

    await stream.send({ message: 'Hello "world"\nNew line\tTab' })
    await stream.close()

    const text = await readPromise
    expect(text).toBe('data: {"message":"Hello \\"world\\"\\nNew line\\tTab"}\n\n')
  })

  it('closes stream successfully', async () => {
    const stream = createSSEStream()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const { done } = await reader.read()
      return done
    })()

    await stream.close()

    const done = await readPromise
    expect(done).toBe(true)
  })
})

describe('createSSEResponse', () => {
  it('creates Response with correct content type', () => {
    const stream = createSSEStream()
    const response = createSSEResponse(stream.readable)

    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('creates Response with no-cache header', () => {
    const stream = createSSEStream()
    const response = createSSEResponse(stream.readable)

    expect(response.headers.get('Cache-Control')).toBe('no-cache')
  })

  it('creates Response with keep-alive connection', () => {
    const stream = createSSEStream()
    const response = createSSEResponse(stream.readable)

    expect(response.headers.get('Connection')).toBe('keep-alive')
  })

  it('creates Response with all required SSE headers', () => {
    const stream = createSSEStream()
    const response = createSSEResponse(stream.readable)

    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
    expect(response.headers.get('Connection')).toBe('keep-alive')
  })

  it('uses the provided readable stream', async () => {
    const stream = createSSEStream()
    const decoder = new TextDecoder()

    const readPromise = (async () => {
      const reader = stream.readable.getReader()
      const chunks: string[] = []
      let result = await reader.read()
      while (!result.done) {
        chunks.push(decoder.decode(result.value))
        result = await reader.read()
      }
      return chunks.join('')
    })()

    await stream.send({ type: 'test' })
    await stream.close()

    const text = await readPromise
    expect(text).toBe('data: {"type":"test"}\n\n')
  })
})
