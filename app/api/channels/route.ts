import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { homedir } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)

const CHANNELS = [
  {
    name: 'LÊ DUY CRYPTO MAN',
    url: 'https://www.youtube.com/@L%C3%AADuyCryptoMan/streams',
  },
  {
    name: 'ThuanCapital Crypto Finance',
    url: 'https://www.youtube.com/@ThuanCapitalAnalytics/videos',
  },
]

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

const CACHE_TTL = 15 * 60 * 1000
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

  const results: ChannelData[] = await Promise.all(
    CHANNELS.map(async (channel) => {
      try {
        const { stdout } = await execAsync(
          `yt-dlp --playlist-end 5 -j --no-warnings "${channel.url}"`,
          { timeout: 120_000, env, maxBuffer: 20 * 1024 * 1024 },
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
      } catch {
        return { name: channel.name, videos: [], error: 'Failed to fetch' }
      }
    }),
  )

  cache = { data: results, timestamp: Date.now() }
  return NextResponse.json(results)
}
