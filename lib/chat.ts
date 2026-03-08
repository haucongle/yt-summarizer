import type { Message } from '@/types/chat'

const API_URL = 'https://api.openai.com/v1/chat/completions'

export async function streamChat(
  messages: Message[],
  apiKey: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as Record<string, Record<string, string>>)?.error?.message ||
        `API error: ${response.status}`,
    )
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response stream')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) onChunk(content)
      } catch {
        // skip malformed chunks
      }
    }
  }
}

const API_KEY_STORAGE_KEY = 'chatbot-api-key'

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(API_KEY_STORAGE_KEY) || ''
}

export function setStoredApiKey(key: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(API_KEY_STORAGE_KEY, key)
}
