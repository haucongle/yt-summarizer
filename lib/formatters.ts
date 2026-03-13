import { FORMATTING } from './constants'

export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / FORMATTING.MILLISECONDS_PER_SECOND)
  if (s < FORMATTING.SECONDS_PER_MINUTE) return `${s}s`
  const m = Math.floor(s / FORMATTING.SECONDS_PER_MINUTE)
  const rem = s % FORMATTING.SECONDS_PER_MINUTE
  return `${m}m ${rem.toString().padStart(FORMATTING.PAD_WIDTH, FORMATTING.PAD_CHAR)}s`
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / FORMATTING.SECONDS_PER_HOUR)
  const m = Math.floor((seconds % FORMATTING.SECONDS_PER_HOUR) / FORMATTING.SECONDS_PER_MINUTE)
  const s = seconds % FORMATTING.SECONDS_PER_MINUTE
  if (h > 0) return `${h}:${m.toString().padStart(FORMATTING.PAD_WIDTH, FORMATTING.PAD_CHAR)}:${s.toString().padStart(FORMATTING.PAD_WIDTH, FORMATTING.PAD_CHAR)}`
  return `${m}:${s.toString().padStart(FORMATTING.PAD_WIDTH, FORMATTING.PAD_CHAR)}`
}

export function formatViews(count: number | null): string {
  if (!count) return ''
  if (count >= FORMATTING.MILLION) return `${(count / FORMATTING.MILLION).toFixed(FORMATTING.DECIMAL_PLACES)}M views`
  if (count >= FORMATTING.THOUSAND) return `${(count / FORMATTING.THOUSAND).toFixed(FORMATTING.DECIMAL_PLACES)}K views`
  return `${count} views`
}

export function formatUploadDate(dateStr: string | null): string {
  if (!dateStr || dateStr.length !== FORMATTING.DATE_STRING_LENGTH) return ''
  const y = dateStr.slice(FORMATTING.YEAR_START, FORMATTING.YEAR_END)
  const m = dateStr.slice(FORMATTING.MONTH_START, FORMATTING.MONTH_END)
  const d = dateStr.slice(FORMATTING.DAY_START, FORMATTING.DAY_END)
  const date = new Date(`${y}-${m}-${d}`)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / FORMATTING.MILLISECONDS_PER_DAY)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < FORMATTING.DAYS_PER_WEEK) return `${diffDays} days ago`
  if (diffDays < FORMATTING.DAYS_PER_MONTH_APPROX) return `${Math.floor(diffDays / FORMATTING.DAYS_PER_WEEK)} weeks ago`
  return `${d}/${m}/${y}`
}
