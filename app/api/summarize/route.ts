import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import {
  extractVideoId,
  fetchYouTubeTranscript,
  transcribeWithWhisper,
} from '@/lib/youtube'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { url, apiKey } = await req.json()

  const videoId = extractVideoId(url)
  if (!videoId) {
    return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  const openaiKey = apiKey || process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return Response.json(
      { error: 'OpenAI API key is required. Add it in Settings or set OPENAI_API_KEY in .env' },
      { status: 400 },
    )
  }

  const openai = new OpenAI({ apiKey: openaiKey })
  const encoder = new TextEncoder()

  const transform = new TransformStream()
  const writer = transform.writable.getWriter()

  const send = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    try {
      await send({ type: 'status', message: 'Fetching transcript from YouTube...' })
      const ytResult = await fetchYouTubeTranscript(videoId)

      let transcript: { text: string; source: string; wordCount: number }

      if (ytResult) {
        await send({
          type: 'status',
          message: `Transcript found (${ytResult.source}, ${ytResult.wordCount.toLocaleString()} words)`,
        })
        transcript = ytResult
      } else {
        await send({
          type: 'status',
          message: 'No YouTube transcript available. Falling back to Whisper transcription...',
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
            content: `Bạn là chuyên gia tóm tắt nội dung video tiếng Việt. Hãy tạo bản tóm tắt chi tiết, có cấu trúc rõ ràng bằng tiếng Việt.

Cấu trúc:

## Tổng quan
2-3 câu mô tả tổng quan nội dung video.

## Các điểm chính
Liệt kê các điểm quan trọng nhất dưới dạng bullet points.

## Nội dung chi tiết
Tóm tắt chi tiết theo từng phần/chủ đề. Dùng heading phụ nếu cần.

## Kết luận
Những điều rút ra được và kết luận chính.

Lưu ý:
- Viết bằng tiếng Việt
- Giữ nguyên thuật ngữ chuyên ngành
- Tóm tắt đầy đủ nhưng súc tích
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
