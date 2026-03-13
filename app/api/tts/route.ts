import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { error as logError } from '@/lib/logger'

export const maxDuration = 120

const MAX_CHUNK_LENGTH = 4000

export function splitTextIntoChunks(text: string): string[] {
  const stripped = text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (stripped.length <= MAX_CHUNK_LENGTH) return [stripped]

  const chunks: string[] = []
  let remaining = stripped

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK_LENGTH) {
      chunks.push(remaining)
      break
    }

    const slice = remaining.substring(0, MAX_CHUNK_LENGTH)

    let splitAt = -1
    for (const sep of ['\n\n', '.\n', '. ', '! ', '? ', ';\n', '; ', ',\n', ', ', '\n']) {
      const idx = slice.lastIndexOf(sep)
      if (idx > MAX_CHUNK_LENGTH * 0.3) {
        splitAt = idx + sep.length
        break
      }
    }

    if (splitAt === -1) {
      splitAt = slice.lastIndexOf(' ')
      if (splitAt === -1) splitAt = MAX_CHUNK_LENGTH
    }

    chunks.push(remaining.substring(0, splitAt).trim())
    remaining = remaining.substring(splitAt).trim()
  }

  return chunks.filter(Boolean)
}

export async function POST(req: NextRequest) {
  const { text } = await req.json()

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

  try {
    const audioBuffers: ArrayBuffer[] = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'nova',
          input: chunk,
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
