import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { error as logError } from '@/lib/logger'
import { splitTextIntoChunks } from '@/lib/tts-utils'

export { splitTextIntoChunks }

export const maxDuration = 120

const STREAM_CONCURRENCY = 3

const TTS_MODEL = 'gpt-4o-mini-tts'
const TTS_VOICE = 'shimmer'
const TTS_INSTRUCTIONS =
  'Speak in natural, fluent Vietnamese with correct tones (dấu sắc, huyền, hỏi, ngã, nặng). Use a warm, clear, conversational delivery.'

function createStreamingResponse(chunks: string[], openai: OpenAI) {
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const pending = new Map<number, Promise<ArrayBuffer>>()

        const enqueue = (i: number) => {
          if (i >= chunks.length || pending.has(i)) return
          pending.set(
            i,
            openai.audio.speech
              .create({
                model: TTS_MODEL,
                voice: TTS_VOICE,
                input: chunks[i],
                instructions: TTS_INSTRUCTIONS,
                response_format: 'mp3',
              })
              .then((r) => r.arrayBuffer()),
          )
        }

        for (let i = 0; i < Math.min(STREAM_CONCURRENCY, chunks.length); i++) enqueue(i)

        for (let i = 0; i < chunks.length; i++) {
          const buffer = await pending.get(i)!
          pending.delete(i)
          enqueue(i + STREAM_CONCURRENCY)

          const base64 = Buffer.from(buffer).toString('base64')
          send({ type: 'audio', chunk: base64, index: i, total: chunks.length })
        }

        send({ type: 'done' })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'TTS generation failed'
        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function POST(req: NextRequest) {
  const { text, stream: useStream } = await req.json()

  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'Text is required' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }

  const openai = new OpenAI({ apiKey })
  const chunks = splitTextIntoChunks(text)

  if (useStream) {
    return createStreamingResponse(chunks, openai)
  }

  try {
    const audioBuffers: ArrayBuffer[] = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await openai.audio.speech.create({
          model: TTS_MODEL,
          voice: TTS_VOICE,
          input: chunk,
          instructions: TTS_INSTRUCTIONS,
          response_format: 'mp3',
        })
        return response.arrayBuffer()
      }),
    )

    const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const buf of audioBuffers) {
      combined.set(new Uint8Array(buf), offset)
      offset += buf.byteLength
    }

    return new Response(combined, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': totalLength.toString(),
      },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'TTS generation failed'
    logError('TTS generation failed', {
      textLength: text.length,
      chunkCount: chunks.length,
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: message }, { status: 500 })
  }
}
