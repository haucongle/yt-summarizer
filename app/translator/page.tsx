'use client'

import Link from 'next/link'
import { useState, useRef, useCallback, useEffect } from 'react'

type Lang = 'en-sg' | 'vi'
type Temperature = 0 | 0.5 | 1

const LANG_LABELS: Record<Lang, string> = {
  'en-sg': 'English (SG)',
  vi: 'Tiếng Việt',
}

const TEMP_OPTIONS: { value: Temperature; label: string; desc: string }[] = [
  { value: 0, label: 'Precise', desc: 'Deterministic, consistent' },
  { value: 0.5, label: 'Balanced', desc: 'Natural, recommended' },
  { value: 1, label: 'Creative', desc: 'Varied, expressive' },
]

export default function TranslatorPage() {
  const [sourceLang, setSourceLang] = useState<Lang>('en-sg')
  const [targetLang, setTargetLang] = useState<Lang>('vi')
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [temperature, setTemperature] = useState<Temperature>(0.5)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [playingSource, setPlayingSource] = useState(false)
  const [playingTarget, setPlayingTarget] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const translate = useCallback(
    async (text: string, src: Lang, tgt: Lang, temp: Temperature) => {
      if (!text.trim()) {
        setTranslatedText('')
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsTranslating(true)
      setError(null)
      setTranslatedText('')

      try {
        const res = await fetch('/api/translate/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            sourceLang: src,
            targetLang: tgt,
            temperature: temp,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Translation failed')
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const cleaned = line.replace(/^data: /, '')
            if (!cleaned) continue

            try {
              const event = JSON.parse(cleaned)
              if (event.type === 'content') {
                setTranslatedText((prev) => prev + event.text)
              } else if (event.type === 'error') {
                setError(event.message)
              }
            } catch {
              // skip malformed events
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Translation failed')
      } finally {
        setIsTranslating(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!sourceText.trim()) {
      setTranslatedText('')
      return
    }

    debounceRef.current = setTimeout(() => {
      translate(sourceText, sourceLang, targetLang, temperature)
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [sourceText, sourceLang, targetLang, temperature, translate])

  const swapLanguages = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText('')
  }

  const copyTranslation = async () => {
    if (!translatedText) return
    await navigator.clipboard.writeText(translatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearSource = () => {
    setSourceText('')
    setTranslatedText('')
    setError(null)
    abortRef.current?.abort()
    stopAudio()
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingSource(false)
    setPlayingTarget(false)
  }

  const speak = async (text: string, side: 'source' | 'target') => {
    if (!text.trim()) return

    stopAudio()
    const setSpeaking = side === 'source' ? setPlayingSource : setPlayingTarget
    setSpeaking(true)

    try {
      const res = await fetch('/api/tts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) throw new Error('TTS failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setSpeaking(false)
        URL.revokeObjectURL(url)
        audioRef.current = null
      }

      audio.onerror = () => {
        setSpeaking(false)
        URL.revokeObjectURL(url)
        audioRef.current = null
      }

      await audio.play()
    } catch {
      setSpeaking(false)
    }
  }

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [sourceText])

  const charCount = sourceText.length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70 transition-colors mb-6"
          >
            <span>←</span>
            <span>Back to Toolkit</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Translator</h1>
          <p className="mt-2 text-foreground/50">
            AI-powered translation between English (Singaporean) and Vietnamese.
          </p>
        </div>

        {/* Temperature selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-foreground/60">
              Translation style
            </span>
          </div>
          <div className="flex gap-2">
            {TEMP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTemperature(opt.value)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-left transition-all ${
                  temperature === opt.value
                    ? 'border-foreground/30 bg-foreground/10'
                    : 'border-foreground/10 bg-foreground/[0.03] hover:border-foreground/20 hover:bg-foreground/[0.06]'
                }`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-foreground/40 mt-0.5">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center justify-center rounded-lg border border-foreground/10 bg-foreground/[0.03] py-2.5 px-4">
            <span className="text-sm font-medium">
              {LANG_LABELS[sourceLang]}
            </span>
          </div>
          <button
            onClick={swapLanguages}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] hover:bg-foreground/10 transition-colors"
            title="Swap languages"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rotate-90"
            >
              <path d="M7 16V4m0 0L3 8m4-4l4 4" />
              <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
          <div className="flex-1 flex items-center justify-center rounded-lg border border-foreground/10 bg-foreground/[0.03] py-2.5 px-4">
            <span className="text-sm font-medium">
              {LANG_LABELS[targetLang]}
            </span>
          </div>
        </div>

        {/* Translation panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source */}
          <div className="relative flex flex-col rounded-xl border border-foreground/10 bg-foreground/[0.03]">
            <textarea
              ref={textareaRef}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={
                sourceLang === 'en-sg'
                  ? 'Type in English (SG)...'
                  : 'Nhập tiếng Việt...'
              }
              rows={4}
              className="min-h-[120px] max-h-[60vh] w-full resize-none overflow-y-auto bg-transparent p-4 pb-10 text-[15px] leading-relaxed placeholder:text-foreground/25 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-between border-t border-foreground/[0.06] px-4 py-2">
              <span className="text-xs text-foreground/30">
                {charCount > 0 && `${charCount.toLocaleString()} chars`}
              </span>
              <div className="flex items-center gap-2">
                {sourceText && (
                  <button
                    onClick={() =>
                      playingSource ? stopAudio() : speak(sourceText, 'source')
                    }
                    className={`text-foreground/40 hover:text-foreground/70 transition-colors p-1 ${playingSource ? 'text-foreground/70' : ''}`}
                    title={playingSource ? 'Stop' : 'Listen'}
                  >
                    {playingSource ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    )}
                  </button>
                )}
                {sourceText && (
                  <button
                    onClick={clearSource}
                    className="text-xs text-foreground/40 hover:text-foreground/70 transition-colors px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Target */}
          <div className="relative flex flex-col rounded-xl border border-foreground/10 bg-foreground/[0.03]">
            <div className="min-h-[120px] max-h-[60vh] w-full overflow-y-auto p-4 pb-10 text-[15px] leading-relaxed">
              {error ? (
                <span className="text-red-400">{error}</span>
              ) : translatedText ? (
                <span className="whitespace-pre-wrap">{translatedText}</span>
              ) : isTranslating ? (
                <span className="text-foreground/30 flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/30 animate-pulse" />
                  Translating...
                </span>
              ) : (
                <span className="text-foreground/25">Translation</span>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-foreground/[0.06] px-4 py-2">
              <span className="text-xs text-foreground/30">
                {translatedText &&
                  `${translatedText.length.toLocaleString()} chars`}
              </span>
              <div className="flex items-center gap-2">
                {translatedText && (
                  <button
                    onClick={() =>
                      playingTarget
                        ? stopAudio()
                        : speak(translatedText, 'target')
                    }
                    className={`text-foreground/40 hover:text-foreground/70 transition-colors p-1 ${playingTarget ? 'text-foreground/70' : ''}`}
                    title={playingTarget ? 'Stop' : 'Listen'}
                  >
                    {playingTarget ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    )}
                  </button>
                )}
                {translatedText && (
                  <button
                    onClick={copyTranslation}
                    className="text-xs text-foreground/40 hover:text-foreground/70 transition-colors px-2 py-1 flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-foreground/30">
            Powered by GPT-5.4
          </p>
        </div>
      </div>
    </div>
  )
}
