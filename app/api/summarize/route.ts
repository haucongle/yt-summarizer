import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import {
  extractVideoId,
  fetchYouTubeTranscript,
  fetchSubtitlesWithYtDlp,
  transcribeWithWhisper,
} from '@/lib/youtube'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { url, apiKey } = await req.json()

  const videoId = extractVideoId(url)
  if (!videoId) {
    return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  if (!apiKey) {
    return Response.json(
      { error: 'OpenAI API key is required. Please enter your API key in Settings.' },
      { status: 400 },
    )
  }
  const openaiKey = apiKey

  const openai = new OpenAI({ apiKey: openaiKey })
  const encoder = new TextEncoder()

  const transform = new TransformStream()
  const writer = transform.writable.getWriter()

  const send = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    try {
      let transcript: { text: string; source: string; wordCount: number } | null = null

      // Tier 1: YouTube transcript via npm (~2s)
      await send({ type: 'status', message: 'Fetching transcript from YouTube...' })
      transcript = await fetchYouTubeTranscript(videoId)

      // Tier 2: yt-dlp subtitle extraction (~3-5s, no audio download)
      if (!transcript) {
        await send({ type: 'status', message: 'Trying yt-dlp subtitle extraction...' })
        transcript = await fetchSubtitlesWithYtDlp(videoId)
      }

      if (transcript) {
        await send({
          type: 'status',
          message: `Transcript found (${transcript.source}, ${transcript.wordCount.toLocaleString()} words)`,
        })
      }

      // Tier 3: Audio download + parallel Whisper (slow, last resort)
      if (!transcript) {
        await send({
          type: 'status',
          message: 'No subtitles available. Downloading audio for Whisper transcription...',
        })
        transcript = await transcribeWithWhisper(videoId, openai, async (msg) => {
          await send({ type: 'status', message: msg })
        })
        await send({
          type: 'status',
          message: `Transcription complete (${transcript.wordCount.toLocaleString()} words)`,
        })
      }

      await send({ type: 'status', message: 'Generating summary with GPT-4o...' })
      await send({
        type: 'transcript_info',
        source: transcript.source,
        wordCount: transcript.wordCount,
      })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Transcript có thể bằng tiếng Anh hoặc tiếng Việt — nhiệm vụ của bạn là dịch (nếu cần) và tóm tắt toàn bộ nội dung sang tiếng Việt.

Hãy tóm tắt tự nhiên, rõ ràng. Không cần theo format cố định — tự tổ chức nội dung sao cho dễ đọc và phù hợp nhất với video.

Lưu ý:
- Viết bằng tiếng Việt
- Giữ nguyên thuật ngữ chuyên ngành
- Dùng markdown formatting`,
          },
          {
            role: 'user',
            content: `Hãy tóm tắt transcript video sau:\n\n${transcript.text}`,
          },
        ],
        stream: true,
        max_tokens: 4096,
      })

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          await send({ type: 'content', text: content })
        }
      }

      await send({ type: 'done' })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred'
      await send({ type: 'error', message })
    } finally {
      await writer.close()
    }
  })()

  return new Response(transform.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
