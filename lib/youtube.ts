import { YoutubeTranscript } from 'youtube-transcript'
import { createReadStream } from 'fs'
import { readdir, readFile, stat, mkdtemp, rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir, homedir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import type OpenAI from 'openai'

const execAsync = promisify(exec)

const home = homedir()
const PATH_SEP = process.platform === 'win32' ? ';' : ':'
const SHELL_ENV = {
  ...process.env,
  PATH: [
    join(home, '.deno/bin'),
    join(home, '.local/bin'),
    process.env.PATH,
  ].join(PATH_SEP),
}

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

// --- Tier 1: YouTube transcript via npm (fastest, ~2s) ---

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

// --- Tier 2: yt-dlp subtitle extraction (fast, ~3-5s, no audio download) ---

export async function fetchSubtitlesWithYtDlp(
  videoId: string,
): Promise<TranscriptResult | null> {
  if (!(await isCommandAvailable('yt-dlp'))) return null

  const tmpDir = await mkdtemp(join(tmpdir(), 'yt-subs-'))

  try {
    await execAsync(
      `yt-dlp --remote-components ejs:github --write-auto-sub --sub-lang vi --skip-download --convert-subs srt ` +
        `-o "${join(tmpDir, 'subs')}" "https://www.youtube.com/watch?v=${videoId}"`,
      { timeout: 30_000, env: SHELL_ENV },
    )

    const files = await readdir(tmpDir)
    const srtFile = files.find((f) => f.endsWith('.srt'))
    if (!srtFile) return null

    const srtContent = await readFile(join(tmpDir, srtFile), 'utf-8')
    const text = parseSrt(srtContent)
    if (!text) return null

    return { text, source: 'youtube-auto', wordCount: text.split(/\s+/).length }
  } catch {
    return null
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

export function parseSrt(srt: string): string {
  return srt
    .replace(
      /\d+\r?\n\d{2}:\d{2}:\d{2}[.,]\d{3} --> \d{2}:\d{2}:\d{2}[.,]\d{3}\r?\n/g,
      '',
    )
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
}

// --- Tier 3: Audio download + parallel Whisper (slow, last resort) ---

async function isCommandAvailable(cmd: string): Promise<boolean> {
  const check = process.platform === 'win32' ? 'where' : 'which'
  try {
    await execAsync(`${check} ${cmd}`, { env: SHELL_ENV })
    return true
  } catch {
    return false
  }
}

async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      worker(),
    ),
  )
  return results
}

export async function transcribeWithWhisper(
  videoId: string,
  openai: OpenAI,
  onProgress: (message: string) => Promise<void>,
): Promise<TranscriptResult> {
  if (!(await isCommandAvailable('yt-dlp'))) {
    throw new Error('yt-dlp is not installed. Run: pip install yt-dlp')
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'yt-summarize-'))
  const audioPath = join(tmpDir, 'audio.mp3')

  try {
    await onProgress('Downloading audio...')
    const dlStart = Date.now()
    await execAsync(
      `yt-dlp --remote-components ejs:github -x --audio-format mp3 --audio-quality 7 -o "${audioPath}" "https://www.youtube.com/watch?v=${videoId}"`,
      { timeout: 600_000, env: SHELL_ENV },
    )

    const fileStat = await stat(audioPath)
    const sizeMB = fileStat.size / (1024 * 1024)
    const dlSec = ((Date.now() - dlStart) / 1000).toFixed(0)
    await onProgress(`Audio downloaded (${sizeMB.toFixed(1)} MB in ${dlSec}s)`)

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

      await onProgress('Splitting audio into 5-minute chunks...')
      await execAsync(
        `ffmpeg -i "${audioPath}" -f segment -segment_time 300 -c:a libmp3lame -q:a 7 "${chunkDir}/chunk_%03d.mp3"`,
        { timeout: 300_000, env: SHELL_ENV },
      )

      const chunks = (await readdir(chunkDir))
        .filter((f) => f.endsWith('.mp3'))
        .sort()

      const CONCURRENCY = 5
      let completed = 0
      const txStart = Date.now()
      await onProgress(
        `Transcribing ${chunks.length} chunks (${CONCURRENCY} in parallel)...`,
      )

      const transcripts = await parallelMap(
        chunks,
        async (chunk) => {
          const response = await openai.audio.transcriptions.create({
            file: createReadStream(join(chunkDir, chunk)),
            model: 'whisper-1',
            language: 'vi',
          })
          completed++
          const elapsed = ((Date.now() - txStart) / 1000).toFixed(0)
          const eta =
            completed < chunks.length
              ? ` ~${(((Date.now() - txStart) / completed) * (chunks.length - completed) / 1000).toFixed(0)}s left`
              : ''
          await onProgress(
            `Transcribed ${completed}/${chunks.length} (${elapsed}s${eta})`,
          )
          return response.text
        },
        CONCURRENCY,
      )

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
