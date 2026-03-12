'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type DiffLine =
  | { type: 'equal'; left: string; right: string; leftNum: number; rightNum: number }
  | { type: 'removed'; left: string; leftNum: number }
  | { type: 'added'; right: string; rightNum: number }

function computeDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split('\n')
  const linesB = b.split('\n')
  const m = linesA.length
  const n = linesB.length

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (linesA[i] === linesB[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  const result: DiffLine[] = []
  let i = 0, j = 0
  let leftNum = 1, rightNum = 1

  while (i < m || j < n) {
    if (i < m && j < n && linesA[i] === linesB[j]) {
      result.push({ type: 'equal', left: linesA[i], right: linesB[j], leftNum: leftNum++, rightNum: rightNum++ })
      i++; j++
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: 'added', right: linesB[j], rightNum: rightNum++ })
      j++
    } else if (i < m) {
      result.push({ type: 'removed', left: linesA[i], leftNum: leftNum++ })
      i++
    }
  }

  return result
}

function DiffStats({ diff }: { diff: DiffLine[] }) {
  const added = diff.filter((d) => d.type === 'added').length
  const removed = diff.filter((d) => d.type === 'removed').length
  const unchanged = diff.filter((d) => d.type === 'equal').length

  if (added === 0 && removed === 0) {
    return <span className="text-xs text-foreground/40">No differences found</span>
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      {removed > 0 && <span className="text-red-400">-{removed} removed</span>}
      {added > 0 && <span className="text-green-400">+{added} added</span>}
      <span className="text-foreground/30">{unchanged} unchanged</span>
    </div>
  )
}

export default function DiffChecker() {
  const [original, setOriginal] = useState('')
  const [changed, setChanged] = useState('')
  const [showDiff, setShowDiff] = useState(false)

  const diff = useMemo(() => {
    if (!showDiff) return []
    return computeDiff(original, changed)
  }, [original, changed, showDiff])

  const handleFindDiff = () => {
    setShowDiff(true)
  }

  const handleClear = () => {
    setOriginal('')
    setChanged('')
    setShowDiff(false)
  }

  const handleFileLoad = (side: 'original' | 'changed') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.json,.js,.ts,.tsx,.jsx,.css,.html,.md,.xml,.yaml,.yml,.csv,.sql,.py,.go,.rs,.java,.c,.cpp,.h,.sh,.env,.toml,.cfg,.ini,.log'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        if (side === 'original') setOriginal(text)
        else setChanged(text)
        setShowDiff(false)
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          ← Back to Toolkit
        </Link>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Diff Checker</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Compare two texts and find the differences.
            </p>
          </div>
          {showDiff && <DiffStats diff={diff} />}
        </div>

        {!showDiff ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    Original
                  </label>
                  <button
                    onClick={() => handleFileLoad('original')}
                    className="text-xs text-foreground/35 hover:text-foreground/60 transition-colors"
                  >
                    Open file
                  </button>
                </div>
                <textarea
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                  placeholder="Paste original text here..."
                  className="h-[60vh] w-full resize-none rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 font-mono text-sm outline-none transition-colors focus:border-foreground/25 placeholder:text-foreground/20"
                  spellCheck={false}
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    Changed
                  </label>
                  <button
                    onClick={() => handleFileLoad('changed')}
                    className="text-xs text-foreground/35 hover:text-foreground/60 transition-colors"
                  >
                    Open file
                  </button>
                </div>
                <textarea
                  value={changed}
                  onChange={(e) => setChanged(e.target.value)}
                  placeholder="Paste changed text here..."
                  className="h-[60vh] w-full resize-none rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 font-mono text-sm outline-none transition-colors focus:border-foreground/25 placeholder:text-foreground/20"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleFindDiff}
                disabled={!original && !changed}
                className="rounded-lg bg-foreground px-8 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Find Difference
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => setShowDiff(false)}
                className="rounded-lg border border-foreground/10 px-4 py-2 text-sm text-foreground/60 transition-colors hover:border-foreground/20 hover:text-foreground/80"
              >
                ← Edit texts
              </button>
              <button
                onClick={handleClear}
                className="rounded-lg border border-foreground/10 px-4 py-2 text-sm text-foreground/60 transition-colors hover:border-foreground/20 hover:text-foreground/80"
              >
                Clear all
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-foreground/10">
              <div className="grid grid-cols-2 border-b border-foreground/10 bg-foreground/[0.05]">
                <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  Original
                </div>
                <div className="border-l border-foreground/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  Changed
                </div>
              </div>
              <div className="max-h-[70vh] overflow-y-auto font-mono text-sm">
                {diff.map((line, i) => (
                  <div key={i} className="grid grid-cols-2">
                    {line.type === 'equal' && (
                      <>
                        <div className="flex">
                          <span className="w-12 shrink-0 select-none px-2 py-px text-right text-foreground/20">
                            {line.leftNum}
                          </span>
                          <pre className="flex-1 whitespace-pre-wrap break-all px-3 py-px">{line.left}</pre>
                        </div>
                        <div className="flex border-l border-foreground/10">
                          <span className="w-12 shrink-0 select-none px-2 py-px text-right text-foreground/20">
                            {line.rightNum}
                          </span>
                          <pre className="flex-1 whitespace-pre-wrap break-all px-3 py-px">{line.right}</pre>
                        </div>
                      </>
                    )}
                    {line.type === 'removed' && (
                      <>
                        <div className="flex bg-red-500/10">
                          <span className="w-12 shrink-0 select-none bg-red-500/15 px-2 py-px text-right text-red-400/60">
                            {line.leftNum}
                          </span>
                          <pre className="flex-1 whitespace-pre-wrap break-all px-3 py-px text-red-300">{line.left}</pre>
                        </div>
                        <div className="border-l border-foreground/10 bg-foreground/[0.02]" />
                      </>
                    )}
                    {line.type === 'added' && (
                      <>
                        <div className="bg-foreground/[0.02]" />
                        <div className="flex border-l border-foreground/10 bg-green-500/10">
                          <span className="w-12 shrink-0 select-none bg-green-500/15 px-2 py-px text-right text-green-400/60">
                            {line.rightNum}
                          </span>
                          <pre className="flex-1 whitespace-pre-wrap break-all px-3 py-px text-green-300">{line.right}</pre>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
