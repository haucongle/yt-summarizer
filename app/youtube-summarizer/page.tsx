'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { extractVideoId } from '@/lib/youtube-utils'
import { formatElapsed, formatDuration, formatViews, formatUploadDate } from '@/lib/formatters'

interface Video {
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
  videos: Video[]
  error?: string
}

export default function YouTubeSummarizer() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [transcriptInfo, setTranscriptInfo] = useState<{
    source: string
    wordCount: number
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [channels, setChannels] = useState<ChannelData[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle')
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [feedOpen, setFeedOpen] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsAbortRef = useRef<AbortController | null>(null)
  const audioQueueRef = useRef<string[]>([])
  const currentChunkIndexRef = useRef(0)
  const ttsStreamingRef = useRef(false)
  const waitingForChunkRef = useRef(false)
  const playbackSpeedRef = useRef(playbackSpeed)
  playbackSpeedRef.current = playbackSpeed
  const [ttsProgress, setTtsProgress] = useState<{ current: number; total: number } | null>(null)

  const videoId = extractVideoId(url)
  const lastSubmittedId = useRef<string | null>(null)

  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.scrollTop = summaryRef.current.scrollHeight
    }
  }, [summary])

  const startTimer = () => {
    startTimeRef.current = Date.now()
    setElapsed(0)
    setTotalTime(0)
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setTotalTime(Date.now() - startTimeRef.current)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data) => setChannels(data))
      .catch(() => {})
      .finally(() => setFeedLoading(false))
  }, [])

  const handleSubmit = useCallback(async () => {
    const vid = extractVideoId(url)
    if (!url || !vid || loading) return

    lastSubmittedId.current = vid
    handleTtsStop()
    setLoading(true)
    setStatus('')
    setSummary('')
    setError('')
    setTranscriptInfo(null)
    startTimer()

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Request failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        while (buffer.includes('\n\n')) {
          const idx = buffer.indexOf('\n\n')
          const event = buffer.substring(0, idx)
          buffer = buffer.substring(idx + 2)

          if (event.startsWith('data: ')) {
            try {
              const data = JSON.parse(event.substring(6))
              switch (data.type) {
                case 'status':
                  setStatus(data.message)
                  break
                case 'content':
                  setSummary((prev) => prev + data.text)
                  setStatus('')
                  break
                case 'transcript_info':
                  setTranscriptInfo({
                    source: data.source,
                    wordCount: data.wordCount,
                  })
                  break
                case 'error':
                  setError(data.message)
                  break
                case 'done':
                  setStatus('')
                  break
              }
            } catch (err: unknown) {
              // Ignore malformed JSON during streaming
              if (err instanceof Error) {
                console.error('Failed to parse streaming event:', err.message)
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      stopTimer()
      setLoading(false)
      abortRef.current = null
    }
  }, [url, loading])

  useEffect(() => {
    if (videoId && videoId !== lastSubmittedId.current && !loading) {
      handleSubmit()
    }
  }, [videoId, loading, handleSubmit])

  const handleStop = () => {
    abortRef.current?.abort()
    stopTimer()
    setLoading(false)
    setStatus('')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const playNextChunk = useCallback(() => {
    const queue = audioQueueRef.current
    const idx = currentChunkIndexRef.current

    if (idx >= queue.length) {
      if (!ttsStreamingRef.current) {
        setTtsState('idle')
        setTtsProgress(null)
        audioRef.current = null
      } else {
        waitingForChunkRef.current = true
      }
      return
    }

    waitingForChunkRef.current = false

    const audio = new Audio(queue[idx])
    audio.playbackRate = playbackSpeedRef.current
    audioRef.current = audio

    audio.onended = () => {
      URL.revokeObjectURL(queue[idx])
      currentChunkIndexRef.current++
      playNextChunk()
    }

    audio.onerror = () => {
      URL.revokeObjectURL(queue[idx])
      currentChunkIndexRef.current++
      playNextChunk()
    }

    audio.play().then(() => {
      setTtsState('playing')
    }).catch(() => {
      currentChunkIndexRef.current++
      playNextChunk()
    })
  }, [])

  const handleTts = async () => {
    if (ttsState === 'loading') return

    if (ttsState === 'playing') {
      audioRef.current?.pause()
      setTtsState('paused')
      return
    }

    if (ttsState === 'paused' && audioRef.current) {
      audioRef.current.play()
      setTtsState('playing')
      return
    }

    setTtsState('loading')
    setTtsProgress(null)
    ttsAbortRef.current = new AbortController()
    audioQueueRef.current = []
    currentChunkIndexRef.current = 0
    ttsStreamingRef.current = true

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: summary, stream: true }),
        signal: ttsAbortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'TTS failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let firstChunkPlayed = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        while (buffer.includes('\n\n')) {
          const idx = buffer.indexOf('\n\n')
          const event = buffer.substring(0, idx)
          buffer = buffer.substring(idx + 2)

          if (!event.startsWith('data: ')) continue

          try {
            const data = JSON.parse(event.substring(6))

            if (data.type === 'audio') {
              const binary = atob(data.chunk)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i)
              }
              const blob = new Blob([bytes], { type: 'audio/mpeg' })
              const blobUrl = URL.createObjectURL(blob)
              audioQueueRef.current.push(blobUrl)
              setTtsProgress({ current: data.index + 1, total: data.total })

              if (!firstChunkPlayed) {
                firstChunkPlayed = true
                playNextChunk()
              } else if (waitingForChunkRef.current) {
                playNextChunk()
              }
            } else if (data.type === 'error') {
              throw new Error(data.message)
            }
          } catch (parseErr: unknown) {
            if (parseErr instanceof Error && parseErr.message !== 'TTS generation failed') {
              if (parseErr instanceof SyntaxError) continue
              throw parseErr
            }
            throw parseErr
          }
        }
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (!isAbort) {
        if (err instanceof Error) setError(err.message)
        const queueStart = audioRef.current
          ? currentChunkIndexRef.current + 1
          : currentChunkIndexRef.current
        if (audioRef.current) {
          audioRef.current.pause()
          URL.revokeObjectURL(audioRef.current.src)
          audioRef.current = null
        }
        for (let i = queueStart; i < audioQueueRef.current.length; i++) {
          URL.revokeObjectURL(audioQueueRef.current[i])
        }
        audioQueueRef.current = []
        currentChunkIndexRef.current = 0
        waitingForChunkRef.current = false
        setTtsState('idle')
        setTtsProgress(null)
      }
    } finally {
      ttsStreamingRef.current = false
      ttsAbortRef.current = null

      if (!audioRef.current && currentChunkIndexRef.current >= audioQueueRef.current.length) {
        setTtsState('idle')
        setTtsProgress(null)
      }
    }
  }

  const handleTtsStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      URL.revokeObjectURL(audioRef.current.src)
      audioRef.current = null
    }
    for (let i = currentChunkIndexRef.current + 1; i < audioQueueRef.current.length; i++) {
      URL.revokeObjectURL(audioQueueRef.current[i])
    }
    audioQueueRef.current = []
    currentChunkIndexRef.current = 0
    ttsStreamingRef.current = false
    waitingForChunkRef.current = false
    ttsAbortRef.current?.abort()
    setTtsState('idle')
    setTtsProgress(null)
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed
  }, [playbackSpeed])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
      audioQueueRef.current.forEach((u) => URL.revokeObjectURL(u))
      audioQueueRef.current = []
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          ← Back to Toolkit
        </Link>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            YouTube Summarizer
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Pick a video or paste a URL to get a summary in Vietnamese.
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setFeedOpen(!feedOpen)}
            className="flex items-center gap-2 text-xs font-medium text-foreground/50 hover:text-foreground/70 transition-colors"
          >
            <span className={`transition-transform ${feedOpen ? 'rotate-90' : ''}`}>▶</span>
            Favorite Channels
            {!feedLoading && (
              <span className="text-foreground/30">
                ({channels.reduce((n, ch) => n + ch.videos.length, 0)} videos)
              </span>
            )}
          </button>
          {feedOpen && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {feedLoading
                ? [0, 1].map((col) => (
                    <div key={col} className="space-y-2">
                      <div className="h-4 w-40 animate-pulse rounded bg-foreground/10" />
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex gap-3 rounded-lg border border-foreground/10 p-2.5"
                        >
                          <div className="h-[72px] w-[128px] shrink-0 animate-pulse rounded bg-foreground/10" />
                          <div className="flex flex-1 flex-col justify-between py-0.5">
                            <div className="h-3.5 w-full animate-pulse rounded bg-foreground/8" />
                            <div className="h-3.5 w-3/4 animate-pulse rounded bg-foreground/8" />
                            <div className="h-3 w-1/2 animate-pulse rounded bg-foreground/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                : channels.map((ch) =>
                    ch.videos.length > 0 ? (
                      <div key={ch.name} className="flex flex-col overflow-hidden">
                        <h2 className="sticky top-0 z-10 bg-background pb-2 text-xs font-semibold uppercase tracking-wider text-foreground/40">
                          {ch.name}
                        </h2>
                        <div className="space-y-1.5 overflow-y-auto max-h-[70vh] pr-1">
                          {ch.videos.map((video) => (
                            <button
                              key={video.id}
                              onClick={() => setUrl(video.url)}
                              className="group flex w-full gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-2 text-left transition-all hover:border-foreground/25 hover:bg-foreground/[0.07]"
                            >
                              <div className="relative shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="h-[72px] w-[128px] rounded object-cover"
                                />
                                {video.duration && (
                                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 py-px text-[10px] font-mono text-white/90">
                                    {formatDuration(video.duration)}
                                  </span>
                                )}
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col justify-between py-px">
                                <p className="text-[13px] leading-tight font-medium text-foreground/80 line-clamp-2 group-hover:text-foreground">
                                  {video.title}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-foreground/35">
                                  {video.viewCount != null && (
                                    <span>{formatViews(video.viewCount)}</span>
                                  )}
                                  {video.viewCount != null &&
                                    video.uploadDate && <span>·</span>}
                                  {video.uploadDate && (
                                    <span>
                                      {formatUploadDate(video.uploadDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube URL..."
            className="flex-1 rounded-lg border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-sm outline-none transition-colors focus:border-foreground/30 placeholder:text-foreground/30"
          />
          {loading && (
            <button
              onClick={handleStop}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Stop
            </button>
          )}
        </div>

        {videoId && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/5 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
              alt="Video thumbnail"
              className="h-16 w-28 rounded object-cover"
            />
            <p className="text-xs text-foreground/40 font-mono">{videoId}</p>
          </div>
        )}

        {(status || loading) && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60" />
              )}
              {status || 'Processing...'}
            </div>
            {loading && elapsed > 0 && (
              <span className="font-mono text-xs text-foreground/40">
                {formatElapsed(elapsed)}
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {transcriptInfo && (
          <div className="mt-4 flex gap-3 text-xs text-foreground/40">
            <span>
              Source:{' '}
              {transcriptInfo.source === 'youtube-vi'
                ? 'YouTube (Vietnamese)'
                : transcriptInfo.source === 'youtube-auto'
                  ? 'YouTube (auto-generated)'
                  : 'Whisper transcription'}
            </span>
            <span>•</span>
            <span>{transcriptInfo.wordCount.toLocaleString()} words</span>
          </div>
        )}

        {summary && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Summary</h2>
                {totalTime > 0 && (
                  <span className="text-xs text-foreground/40">
                    completed in {formatElapsed(totalTime)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {ttsState !== 'idle' && (
                  <>
                    <button
                      onClick={handleTtsStop}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      aria-label="Stop audio"
                    >
                      Stop
                    </button>
                    <div className="flex items-center gap-1.5">
                      {[1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                            playbackSpeed === s
                              ? 'bg-foreground/15 text-foreground/80'
                              : 'text-foreground/30 hover:text-foreground/50'
                          }`}
                          aria-label={`Playback speed ${s}x`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <button
                  onClick={handleTts}
                  disabled={ttsState === 'loading' || loading}
                  className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={
                    ttsState === 'loading' ? 'Generating audio' :
                    ttsState === 'playing' ? 'Pause audio' :
                    ttsState === 'paused' ? 'Resume audio' :
                    'Listen to summary'
                  }
                >
                  {ttsState === 'loading' && (
                    <div className="h-3 w-3 animate-spin rounded-full border border-foreground/20 border-t-foreground/50" />
                  )}
                  {ttsState === 'loading' ? 'Generating...' :
                   ttsState === 'playing' ? 'Pause' :
                   ttsState === 'paused' ? 'Resume' :
                   'Listen'}
                  {ttsProgress && ttsProgress.total > 1 && ttsState !== 'idle' && (
                    <span className="text-[10px] text-foreground/30 tabular-nums">
                      {ttsProgress.current}/{ttsProgress.total}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div
              ref={summaryRef}
              className="max-h-[70vh] overflow-y-auto rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6"
            >
              <div className="prose-custom">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
