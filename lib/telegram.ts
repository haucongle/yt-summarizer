import * as logger from '@/lib/logger'

const TELEGRAM_MAX_LENGTH = 4096

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  return token
}

async function callApi(method: string, body: Record<string, unknown>) {
  const token = getToken()
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) {
    logger.error(`Telegram API ${method} failed`, { data })
  }
  return data
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return callApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  })
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: {
    parseMode?: string
    replyMarkup?: unknown
    disableWebPagePreview?: boolean
  },
) {
  return callApi('sendMessage', {
    chat_id: chatId,
    text,
    ...(options?.parseMode ? { parse_mode: options.parseMode } : {}),
    ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    ...(options?.disableWebPagePreview
      ? { disable_web_page_preview: true }
      : {}),
  })
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  parseMode?: string,
) {
  return callApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...(parseMode ? { parse_mode: parseMode } : {}),
    disable_web_page_preview: true,
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function markdownToTelegramHtml(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<b>$1</b>')
    .replace(/^## (.+)$/gm, '<b>$1</b>')
    .replace(/^# (.+)$/gm, '<b>$1</b>')

  html = html
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/`(.+?)`/g, '<code>$1</code>')

  return html
}

export function splitForTelegram(text: string): string[] {
  if (text.length <= TELEGRAM_MAX_LENGTH) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= TELEGRAM_MAX_LENGTH) {
      chunks.push(remaining)
      break
    }

    const slice = remaining.substring(0, TELEGRAM_MAX_LENGTH)
    let splitAt = -1

    for (const sep of ['\n\n', '\n', '. ', ' ']) {
      const idx = slice.lastIndexOf(sep)
      if (idx > TELEGRAM_MAX_LENGTH * 0.5) {
        splitAt = idx + sep.length
        break
      }
    }

    if (splitAt === -1) splitAt = TELEGRAM_MAX_LENGTH

    chunks.push(remaining.substring(0, splitAt))
    remaining = remaining.substring(splitAt)
  }

  return chunks
}

export { escapeHtml }
