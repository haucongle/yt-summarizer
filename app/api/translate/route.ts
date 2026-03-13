import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createSSEStream, createSSEResponse } from '@/lib/api-utils'
import { MODELS, TOKENS } from '@/lib/constants'
import { error as logError } from '@/lib/logger'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a translator between English (Singaporean) and Vietnamese.

Rules:
- Output ONLY the translated text, nothing else
- No explanations, notes, or alternatives
- Maintain original formatting (line breaks, bullet points, etc.)
- Singlish particles (lah, leh, lor, meh, hor, sia, etc.) express tone/emphasis — translate their INTENT into equivalent Vietnamese particles (mà, đi, nha, á, nè, thôi, vậy, nhé, etc.), never keep them as-is
- Singlish slang (shiok, jialat, sian, blur, kiasu, etc.) must be translated to natural Vietnamese equivalents, not transliterated
- Keep widely-used English technical terms as-is (API, deploy, PR, etc.)`

export async function POST(req: NextRequest) {
  const { text, sourceLang, targetLang, temperature } = await req.json()

  if (!text?.trim()) {
    return Response.json({ error: 'No text provided' }, { status: 400 })
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

  const langLabels: Record<string, string> = {
    'en-sg': 'English (Singaporean)',
    vi: 'Vietnamese',
  }

  const from = langLabels[sourceLang] || sourceLang
  const to = langLabels[targetLang] || targetLang

  ;(async () => {
    try {
      const stream = await openai.responses.create({
        model: MODELS.GPT,
        instructions: SYSTEM_PROMPT,
        input: `Translate the following from ${from} to ${to}:\n\n${text}`,
        temperature: typeof temperature === 'number' ? temperature : 0.5,
        stream: true,
        max_output_tokens: TOKENS.TRANSLATE_MAX,
      })

      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          await send({ type: 'content', text: event.delta })
        }
      }

      await send({ type: 'done' })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred'
      logError('Translation failed', {
        sourceLang,
        targetLang,
        error: error instanceof Error ? error.message : String(error),
      })
      await send({ type: 'error', message })
    } finally {
      await close()
    }
  })()

  return createSSEResponse(readable)
}
