import { NextRequest } from 'next/server'
import OpenAI from 'openai'

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
  const encoder = new TextEncoder()
  const transform = new TransformStream()
  const writer = transform.writable.getWriter()

  const send = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  const langLabels: Record<string, string> = {
    'en-sg': 'English (Singaporean)',
    vi: 'Vietnamese',
  }

  const from = langLabels[sourceLang] || sourceLang
  const to = langLabels[targetLang] || targetLang

  ;(async () => {
    try {
      const stream = await openai.responses.create({
        model: 'gpt-5.4',
        instructions: SYSTEM_PROMPT,
        input: `Translate the following from ${from} to ${to}:\n\n${text}`,
        temperature: typeof temperature === 'number' ? temperature : 0.5,
        stream: true,
        max_output_tokens: 4096,
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
