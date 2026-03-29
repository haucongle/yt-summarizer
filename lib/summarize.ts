import OpenAI from 'openai'
import {
  fetchYouTubeTranscript,
  fetchSubtitlesWithYtDlp,
  transcribeWithWhisper,
} from '@/lib/youtube'
import { MODELS, TOKENS } from '@/lib/constants'
import * as logger from '@/lib/logger'

const SUMMARIZE_INSTRUCTION = `Transcript có thể bằng tiếng Anh hoặc tiếng Việt — nhiệm vụ của bạn là dịch (nếu cần) và tóm tắt toàn bộ nội dung sang tiếng Việt.

Hãy tóm tắt tự nhiên, rõ ràng. Không cần theo format cố định — tự tổ chức nội dung sao cho dễ đọc và phù hợp nhất với video.

Lưu ý:
- Viết bằng tiếng Việt
- Giữ nguyên thuật ngữ chuyên ngành
- Dùng markdown formatting`

export interface TranscriptInfo {
  source: string
  wordCount: number
}

export interface SummarizeResult {
  summary: string
  transcript: TranscriptInfo
}

export async function fetchTranscript(
  videoId: string,
  openai: OpenAI,
  onProgress?: (message: string) => Promise<void>,
) {
  const report = onProgress ?? (async () => {})

  await report('Fetching transcript from YouTube...')
  let transcript = await fetchYouTubeTranscript(videoId)

  if (!transcript) {
    await report('Trying yt-dlp subtitle extraction...')
    transcript = await fetchSubtitlesWithYtDlp(videoId)
  }

  if (transcript) {
    await report(
      `Transcript found (${transcript.source}, ${transcript.wordCount.toLocaleString()} words)`,
    )
  }

  if (!transcript) {
    await report(
      'No subtitles available. Downloading audio for Whisper transcription...',
    )
    transcript = await transcribeWithWhisper(videoId, openai, report)
    await report(
      `Transcription complete (${transcript.wordCount.toLocaleString()} words)`,
    )
  }

  return transcript
}

export async function summarizeVideo(videoId: string): Promise<SummarizeResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server.')

  const openai = new OpenAI({ apiKey })

  const transcript = await fetchTranscript(videoId, openai)

  logger.info('Generating summary', { videoId, source: transcript.source })

  const response = await openai.responses.create({
    model: MODELS.GPT,
    reasoning: { effort: 'none' },
    instructions: SUMMARIZE_INSTRUCTION,
    input: `Hãy tóm tắt transcript video sau:\n\n${transcript.text}`,
    max_output_tokens: TOKENS.SUMMARIZE_MAX,
  })

  const summary = response.output_text

  return {
    summary,
    transcript: { source: transcript.source, wordCount: transcript.wordCount },
  }
}

export { SUMMARIZE_INSTRUCTION }
