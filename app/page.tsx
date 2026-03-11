'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function extractVideoId(url: string): string | null {
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

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem.toString().padStart(2, '0')}s`
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
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
  const summaryRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const videoId = extractVideoId(url)

  useEffect(() => {
    const saved = localStorage.getItem('openai-api-key')
    if (saved) setApiKey(saved)
  }, [])

  useEffect(() => {
    if (apiKey) localStorage.setItem('openai-api-key', apiKey)
  }, [apiKey])

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

  const handleSubmit = useCallback(async () => {
    if (!url || loading) return

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
        body: JSON.stringify({ url, apiKey }),
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
            } catch {}
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
  }, [url, apiKey, loading])

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            YouTube Summarizer
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Paste a YouTube URL to get an AI-powered summary in Vietnamese.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 rounded-lg border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-sm outline-none transition-colors focus:border-foreground/30 placeholder:text-foreground/30"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            {loading ? (
              <button
                onClick={handleStop}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!url}
                className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Summarize
              </button>
            )}
          </div>

          <div>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
            >
              {showApiKey ? '▾' : '▸'} API Key Settings
            </button>
            {showApiKey && (
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-... (OpenAI API key)"
                className="mt-2 w-full rounded-lg border border-foreground/10 bg-foreground/5 px-4 py-2 text-sm outline-none transition-colors focus:border-foreground/30 placeholder:text-foreground/30"
              />
            )}
          </div>
        </div>

        {videoId && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/5 p-3">
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
              <button
                onClick={handleCopy}
                className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
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
