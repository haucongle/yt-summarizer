import { YoutubeTranscript } from 'youtube-transcript'
import { createReadStream } from 'fs'
import { readdir, stat, mkdtemp, rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import type OpenAI from 'openai'

const execAsync = promisify(exec)

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&#\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export interface TranscriptResult {
  text: string
  source: 'youtube-vi' | 'youtube-auto' | 'whisper'
  wordCount: number
}

export async function fetchYouTubeTranscript(
  videoId: string,
): Promise<TranscriptResult | null> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'vi',
    })
    if (segments.length > 0) {
      const text = segments.map((s) => s.text).join(' ')
      return { text, source: 'youtube-vi', wordCount: text.split(/\s+/).length }
    }
  } catch {}

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId)
    if (segments.length > 0) {
      const text = segments.map((s) => s.text).join(' ')
      return {
        text,
        source: 'youtube-auto',
        wordCount: text.split(/\s+/).length,
      }
    }
  } catch {}

  return null
}

async function isCommandAvailable(cmd: string): Promise<boolean> {
  try {
    await execAsync(`which ${cmd}`)
    return true
  } catch {
    return false
  }
}

export async function transcribeWithWhisper(
  videoId: string,
  openai: OpenAI,
  onProgress: (message: string) => Promise<void>,
): Promise<TranscriptResult> {
  if (!(await isCommandAvailable('yt-dlp'))) {
    throw new Error(
      'yt-dlp is not installed. Run: pip install yt-dlp',
    )
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'yt-summarize-'))
  const audioPath = join(tmpDir, 'audio.mp3')

  try {
    await onProgress('Downloading audio...')
    await execAsync(
      `yt-dlp -x --audio-format mp3 --audio-quality 5 -o "${audioPath}" "https://www.youtube.com/watch?v=${videoId}"`,
      { timeout: 600_000 },
    )

    const fileStat = await stat(audioPath)
    const sizeMB = fileStat.size / (1024 * 1024)
    await onProgress(`Audio downloaded (${sizeMB.toFixed(1)} MB)`)

    let fullText: string

    if (sizeMB <= 24) {
      await onProgress('Transcribing with Whisper...')
      const response = await openai.audio.transcriptions.create({
        file: createReadStream(audioPath),
        model: 'whisper-1',
        language: 'vi',
      })
      fullText = response.text
    } else {
      if (!(await isCommandAvailable('ffmpeg'))) {
        throw new Error(
          'ffmpeg is needed for long videos. Run: sudo apt install ffmpeg',
        )
      }

      const chunkDir = join(tmpDir, 'chunks')
      await mkdir(chunkDir)

      await onProgress('Splitting audio into 10-minute chunks...')
      await execAsync(
        `ffmpeg -i "${audioPath}" -f segment -segment_time 600 -c:a libmp3lame -q:a 5 "${chunkDir}/chunk_%03d.mp3"`,
        { timeout: 300_000 },
      )

      const chunks = (await readdir(chunkDir))
        .filter((f) => f.endsWith('.mp3'))
        .sort()
      const transcripts: string[] = []

      for (let i = 0; i < chunks.length; i++) {
        await onProgress(`Transcribing chunk ${i + 1}/${chunks.length}...`)
        const response = await openai.audio.transcriptions.create({
          file: createReadStream(join(chunkDir, chunks[i])),
          model: 'whisper-1',
          language: 'vi',
        })
        transcripts.push(response.text)
      }

      fullText = transcripts.join('\n\n')
    }

    return {
      text: fullText,
      source: 'whisper',
      wordCount: fullText.split(/\s+/).length,
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}
