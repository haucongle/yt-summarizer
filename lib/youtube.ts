import { YoutubeTranscript } from 'youtube-transcript'
import { createReadStream } from 'fs'
import { readdir, readFile, stat, mkdtemp, rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir, homedir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import type OpenAI from 'openai'
import { extractVideoId, parseSrt } from './youtube-utils'
import * as logger from './logger'
import { TIMEOUTS, AUDIO, MODELS } from './constants'

export { extractVideoId, parseSrt }

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
  } catch (error) {
    logger.warn('Vietnamese transcript fetch failed, trying auto-generated', {
      operation: 'fetchYouTubeTranscript',
      videoId,
      error,
    })
  }

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
  } catch (error) {
    logger.warn('Auto-generated transcript fetch failed', {
      operation: 'fetchYouTubeTranscript',
      videoId,
      error,
    })
  }

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
      { timeout: TIMEOUTS.YT_DLP_SUBTITLE, env: SHELL_ENV },
    )

    const files = await readdir(tmpDir)
    const srtFile = files.find((f) => f.endsWith('.srt'))
    if (!srtFile) return null

    const srtContent = await readFile(join(tmpDir, srtFile), 'utf-8')
    const text = parseSrt(srtContent)
    if (!text) return null

    return { text, source: 'youtube-auto', wordCount: text.split(/\s+/).length }
  } catch (error) {
    logger.warn('yt-dlp subtitle extraction failed', {
      operation: 'fetchSubtitlesWithYtDlp',
      videoId,
      error,
    })
    return null
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch((error) => {
      logger.warn('Failed to cleanup temporary directory', {
        operation: 'fetchSubtitlesWithYtDlp',
        tmpDir,
        error,
      })
    })
  }
}

// --- Tier 2.5: youtubei.js audio download + Whisper (serverless-compatible) ---

export async function transcribeWithYoutubeJs(
  videoId: string,
  openai: OpenAI,
  onProgress: (message: string) => Promise<void>,
): Promise<TranscriptResult> {
  const { Innertube, UniversalCache, Utils } = await import('youtubei.js')

  await onProgress('Downloading audio via youtubei.js...')
  const yt = await Innertube.create({ cache: new UniversalCache(false), generate_session_locally: true })

  const stream = await yt.download(videoId, {
    type: 'audio',
    quality: 'bestefficiency',
  })

  const chunks: Uint8Array[] = []
  for await (const chunk of Utils.streamToIterable(stream)) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)
  const sizeMB = buffer.length / (1024 * 1024)
  await onProgress(`Audio downloaded (${sizeMB.toFixed(1)} MB)`)

  if (sizeMB <= AUDIO.MAX_SINGLE_FILE_MB) {
    await onProgress('Transcribing with Whisper...')
    const file = new File([new Uint8Array(buffer)], 'audio.webm', { type: 'audio/webm' })
    const response = await openai.audio.transcriptions.create({
      file,
      model: MODELS.WHISPER,
      language: 'vi',
    })
    return {
      text: response.text,
      source: 'whisper',
      wordCount: response.text.split(/\s+/).length,
    }
  }

  // Split large files into ~24MB chunks
  const chunkSize = AUDIO.MAX_SINGLE_FILE_MB * 1024 * 1024
  const audioChunks: Buffer[] = []
  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    audioChunks.push(buffer.subarray(offset, offset + chunkSize))
  }

  await onProgress(
    `Transcribing ${audioChunks.length} chunks (${AUDIO.WHISPER_CONCURRENCY} in parallel)...`,
  )

  const transcripts = await parallelMap(
    audioChunks,
    async (chunk, idx) => {
      const file = new File([new Uint8Array(chunk)], `chunk_${idx}.webm`, { type: 'audio/webm' })
      const response = await openai.audio.transcriptions.create({
        file,
        model: MODELS.WHISPER,
        language: 'vi',
      })
      await onProgress(`Transcribed ${idx + 1}/${audioChunks.length}`)
      return response.text
    },
    AUDIO.WHISPER_CONCURRENCY,
  )

  const fullText = transcripts.join('\n\n')
  return {
    text: fullText,
    source: 'whisper',
    wordCount: fullText.split(/\s+/).length,
  }
}

// --- Tier 3: Audio download + parallel Whisper (slow, last resort) ---

async function isCommandAvailable(cmd: string): Promise<boolean> {
  try {
    await execAsync(`${cmd} --version`, { env: SHELL_ENV, timeout: 10_000 })
    return true
  } catch (error) {
    logger.debug('Command not available', {
      operation: 'isCommandAvailable',
      command: cmd,
      error,
    })
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
      { timeout: TIMEOUTS.YT_DLP_AUDIO, env: SHELL_ENV },
    )

    const fileStat = await stat(audioPath)
    const sizeMB = fileStat.size / (1024 * 1024)
    const dlSec = ((Date.now() - dlStart) / 1000).toFixed(0)
    await onProgress(`Audio downloaded (${sizeMB.toFixed(1)} MB in ${dlSec}s)`)

    let fullText: string

    if (sizeMB <= AUDIO.MAX_SINGLE_FILE_MB) {
      await onProgress('Transcribing with Whisper...')
      const response = await openai.audio.transcriptions.create({
        file: createReadStream(audioPath),
        model: MODELS.WHISPER,
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
        `ffmpeg -i "${audioPath}" -f segment -segment_time ${AUDIO.SEGMENT_DURATION_SEC} -c:a libmp3lame -q:a 7 "${chunkDir}/chunk_%03d.mp3"`,
        { timeout: TIMEOUTS.FFMPEG_SPLIT, env: SHELL_ENV },
      )

      const chunks = (await readdir(chunkDir))
        .filter((f) => f.endsWith('.mp3'))
        .sort()

      let completed = 0
      const txStart = Date.now()
      await onProgress(
        `Transcribing ${chunks.length} chunks (${AUDIO.WHISPER_CONCURRENCY} in parallel)...`,
      )

      const transcripts = await parallelMap(
        chunks,
        async (chunk) => {
          const response = await openai.audio.transcriptions.create({
            file: createReadStream(join(chunkDir, chunk)),
            model: MODELS.WHISPER,
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
        AUDIO.WHISPER_CONCURRENCY,
      )

      fullText = transcripts.join('\n\n')
    }

    return {
      text: fullText,
      source: 'whisper',
      wordCount: fullText.split(/\s+/).length,
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch((error) => {
      logger.warn('Failed to cleanup temporary directory', {
        operation: 'transcribeWithWhisper',
        tmpDir,
        error,
      })
    })
  }
}
