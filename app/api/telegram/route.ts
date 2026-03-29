import { NextRequest, after } from 'next/server'
import { summarizeVideo } from '@/lib/summarize'
import {
  answerCallbackQuery,
  sendMessage,
  editMessageText,
  markdownToTelegramHtml,
  splitForTelegram,
  escapeHtml,
} from '@/lib/telegram'
import * as logger from '@/lib/logger'

export const maxDuration = 300

export async function GET() {
  return Response.json({ ok: true, handler: 'telegram-webhook' })
}

export async function POST(req: NextRequest) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ error: 'Bot token not configured' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Handle callback_query (inline button clicks)
  if (body.callback_query) {
    const cb = body.callback_query as {
      id: string
      data?: string
      message?: { chat: { id: number }; message_id: number }
    }

    const videoId = cb.data
    const chatId = cb.message?.chat.id

    if (!videoId || !chatId) {
      return Response.json({ ok: true })
    }

    await answerCallbackQuery(cb.id, 'Summarizing...')

    const placeholderRes = await sendMessage(
      chatId,
      `⏳ Đang tóm tắt video <code>${escapeHtml(videoId)}</code>...`,
      { parseMode: 'HTML' },
    )
    const placeholderMsgId = placeholderRes.result?.message_id

    after(async () => {
      await summarizeAndReply(chatId, videoId, placeholderMsgId)
    })

    return Response.json({ ok: true })
  }

  // Handle /start command with deep-link (e.g., /start VIDEO_ID)
  if (body.message) {
    const msg = body.message as {
      chat: { id: number }
      text?: string
    }
    const text = msg.text?.trim() ?? ''

    if (text.startsWith('/start ')) {
      const videoId = text.substring(7).trim()
      if (videoId) {
        const placeholderRes = await sendMessage(
          msg.chat.id,
          `⏳ Đang tóm tắt video <code>${escapeHtml(videoId)}</code>...`,
          { parseMode: 'HTML' },
        )
        const placeholderMsgId = placeholderRes.result?.message_id

        after(async () => {
          await summarizeAndReply(msg.chat.id, videoId, placeholderMsgId)
        })
      }
    }

    return Response.json({ ok: true })
  }

  return Response.json({ ok: true })
}

async function summarizeAndReply(
  chatId: number,
  videoId: string,
  placeholderMsgId?: number,
) {
  try {
    const { summary } = await summarizeVideo(videoId)
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const header = `📺 <a href="${videoUrl}">${escapeHtml(videoId)}</a>\n\n`
    const htmlSummary = markdownToTelegramHtml(summary)
    const fullText = header + htmlSummary

    const chunks = splitForTelegram(fullText)

    if (placeholderMsgId && chunks.length > 0) {
      await editMessageText(chatId, placeholderMsgId, chunks[0], 'HTML')
      for (let i = 1; i < chunks.length; i++) {
        await sendMessage(chatId, chunks[i], { parseMode: 'HTML' })
      }
    } else {
      for (const chunk of chunks) {
        await sendMessage(chatId, chunk, { parseMode: 'HTML' })
      }
    }

    logger.info('Telegram summary sent', { videoId, chatId, chunks: chunks.length })
  } catch (err) {
    const errMsg =
      err instanceof Error ? err.message : 'An unexpected error occurred'
    logger.error('Telegram summarization failed', { videoId, chatId, error: errMsg })

    const errorText = `❌ Tóm tắt thất bại cho <code>${escapeHtml(videoId)}</code>\n\n${escapeHtml(errMsg)}`

    if (placeholderMsgId) {
      await editMessageText(chatId, placeholderMsgId, errorText, 'HTML')
    } else {
      await sendMessage(chatId, errorText, { parseMode: 'HTML' })
    }
  }
}
