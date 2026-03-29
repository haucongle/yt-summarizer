import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { extractVideoId } from '@/lib/youtube'
import { createSSEStream, createSSEResponse } from '@/lib/api-utils'
import { MODELS, TOKENS } from '@/lib/constants'
import { extractTtsChunk, stripMarkdown } from '@/lib/tts-utils'
import { fetchTranscript, SUMMARIZE_INSTRUCTION } from '@/lib/summarize'
import { error as logError } from '@/lib/logger'

export const maxDuration = 300

const TTS_POLL_MS = 50

export async function POST(req: NextRequest) {
  const { url, tts: enableTts } = await req.json()

  const videoId = extractVideoId(url)
  if (!videoId) {
    return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }

  const openai = new OpenAI({ apiKey })
  const { readable, send, close } = createSSEStream()

  ;(async () => {
    try {
      const transcript = await fetchTranscript(videoId, openai, async (msg) => {
        await send({ type: 'status', message: msg })
      })

      await send({ type: 'status', message: 'Generating summary with GPT-5.4...' })
      await send({
        type: 'transcript_info',
        source: transcript.source,
        wordCount: transcript.wordCount,
      })

      const stream = await openai.responses.create({
        model: MODELS.GPT,
        reasoning: { effort: 'none' },
        instructions: SUMMARIZE_INSTRUCTION,
        input: `Hãy tóm tắt transcript video sau:\n\n${transcript.text}`,
        stream: true,
        max_output_tokens: TOKENS.SUMMARIZE_MAX,
      })

      let ttsBuffer = ''
      const ttsResults: Promise<ArrayBuffer | null>[] = []
      let ttsSendIndex = 0
      let ttsFinalized = false

      const ttsDrainer = enableTts
        ? (async () => {
            while (true) {
              if (ttsSendIndex < ttsResults.length) {
                const buffer = await ttsResults[ttsSendIndex]
                if (buffer) {
                  const base64 = Buffer.from(buffer).toString('base64')
                  await send({
                    type: 'audio',
                    chunk: base64,
                    index: ttsSendIndex,
                    total: ttsFinalized ? ttsResults.length : -1,
                  })
                }
                ttsSendIndex++
              } else if (ttsFinalized) {
                break
              } else {
                await new Promise((r) => setTimeout(r, TTS_POLL_MS))
              }
            }
          })()
        : null

      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          await send({ type: 'content', text: event.delta })

          if (enableTts) {
            ttsBuffer += event.delta
            let extracted = extractTtsChunk(ttsBuffer)
            while (extracted) {
              const { chunk, remaining } = extracted
              ttsBuffer = remaining
              ttsResults.push(
                openai.audio.speech
                  .create({ model: 'tts-1', voice: 'nova', input: chunk, response_format: 'mp3' })
                  .then((r) => r.arrayBuffer())
                  .catch(() => null),
              )
              extracted = extractTtsChunk(ttsBuffer)
            }
          }
        }
      }

      await send({ type: 'done' })

      if (enableTts) {
        const remaining = stripMarkdown(ttsBuffer.trim())
        if (remaining) {
          ttsResults.push(
            openai.audio.speech
              .create({ model: 'tts-1', voice: 'nova', input: remaining, response_format: 'mp3' })
              .then((r) => r.arrayBuffer())
              .catch(() => null),
          )
        }
        ttsFinalized = true
        if (ttsDrainer) {
          await ttsDrainer
          await send({ type: 'tts_done', total: ttsResults.length })
        }
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred'
      logError('Summarization failed', {
        videoId,
        error: error instanceof Error ? error.message : String(error),
      })
      await send({ type: 'error', message })
    } finally {
      await close()
    }
  })()

  return createSSEResponse(readable)
}
