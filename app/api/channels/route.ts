import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { homedir } from 'os'
import { join } from 'path'
import { warn } from '@/lib/logger'

const execAsync = promisify(exec)

function getChannels(): { name: string; url: string }[] {
  const raw = process.env.YOUTUBE_CHANNELS
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    warn('Failed to parse YOUTUBE_CHANNELS env variable', { raw })
    return []
  }
}

interface VideoEntry {
  id: string
  title: string
  url: string
  thumbnail: string
  duration: number | null
  viewCount: number | null
  uploadDate: string | null
  channel: string
}

interface ChannelData {
  name: string
  videos: VideoEntry[]
  error?: string
}

// Cache TTL: 15 minutes in milliseconds
const CACHE_TTL = 15 * 60 * 1000
// yt-dlp timeout: 2 minutes in milliseconds
const YT_DLP_TIMEOUT = 120_000
// yt-dlp max buffer size: 20MB in bytes
const YT_DLP_MAX_BUFFER = 20 * 1024 * 1024

let cache: { data: ChannelData[]; timestamp: number } | null = null

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  const home = homedir()
  const PATH_SEP = process.platform === 'win32' ? ';' : ':'
  const env = {
    ...process.env,
    PATH: [
      join(home, '.deno/bin'),
      join(home, '.local/bin'),
      process.env.PATH,
    ].join(PATH_SEP),
  }

  const channels = getChannels()
  const results: ChannelData[] = await Promise.all(
    channels.map(async (channel) => {
      try {
        const { stdout } = await execAsync(
          `yt-dlp --flat-playlist --extractor-args "youtubetab:approximate_date" --playlist-end 5 -j --no-warnings "${channel.url}"`,
          { timeout: YT_DLP_TIMEOUT, env, maxBuffer: YT_DLP_MAX_BUFFER },
        )
        const lines = stdout.trim().split('\n').filter(Boolean)
        return {
          name: channel.name,
          videos: lines.map((line) => {
            const e = JSON.parse(line) as Record<string, unknown>
            return {
              id: e.id as string,
              title: e.title as string,
              url: `https://www.youtube.com/watch?v=${e.id}`,
              thumbnail: `https://img.youtube.com/vi/${e.id}/mqdefault.jpg`,
              duration: (e.duration as number) || null,
              viewCount: (e.view_count as number) || null,
              uploadDate: (e.upload_date as string) || null,
              channel: channel.name,
            }
          }),
        }
      } catch (error) {
        warn('Failed to fetch channel videos with yt-dlp', {
          channelName: channel.name,
          channelUrl: channel.url,
          error: error instanceof Error ? error.message : String(error),
        })
        return { name: channel.name, videos: [], error: 'Failed to fetch' }
      }
    }),
  )

  cache = { data: results, timestamp: Date.now() }
  return NextResponse.json(results)
}
