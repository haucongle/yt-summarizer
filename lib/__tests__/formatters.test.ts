import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatElapsed,
  formatDuration,
  formatViews,
  formatUploadDate,
} from '../formatters'

describe('formatElapsed', () => {
  it('returns 0s for 0 milliseconds', () => {
    expect(formatElapsed(0)).toBe('0s')
  })

  it('returns seconds for less than 60 seconds', () => {
    expect(formatElapsed(500)).toBe('0s')
    expect(formatElapsed(1000)).toBe('1s')
    expect(formatElapsed(59000)).toBe('59s')
  })

  it('returns minutes and seconds at exactly 60 seconds', () => {
    expect(formatElapsed(60000)).toBe('1m 00s')
  })

  it('pads seconds with leading zero', () => {
    expect(formatElapsed(61000)).toBe('1m 01s')
    expect(formatElapsed(69000)).toBe('1m 09s')
  })

  it('handles large values', () => {
    expect(formatElapsed(3600000)).toBe('60m 00s')
    expect(formatElapsed(3661000)).toBe('61m 01s')
  })
})

describe('formatDuration', () => {
  it('returns empty string for null', () => {
    expect(formatDuration(null)).toBe('')
  })

  it('returns empty string for 0', () => {
    expect(formatDuration(0)).toBe('')
  })

  it('formats seconds only', () => {
    expect(formatDuration(1)).toBe('0:01')
    expect(formatDuration(30)).toBe('0:30')
    expect(formatDuration(59)).toBe('0:59')
  })

  it('formats minutes and seconds at exactly 60 seconds', () => {
    expect(formatDuration(60)).toBe('1:00')
  })

  it('formats minutes and seconds below 1 hour', () => {
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(3599)).toBe('59:59')
  })

  it('formats hours, minutes and seconds at exactly 3600 seconds', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
  })

  it('formats hours with padded minutes and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
    expect(formatDuration(7200)).toBe('2:00:00')
    expect(formatDuration(86399)).toBe('23:59:59')
  })
})

describe('formatViews', () => {
  it('returns empty string for null', () => {
    expect(formatViews(null)).toBe('')
  })

  it('returns empty string for 0', () => {
    expect(formatViews(0)).toBe('')
  })

  it('formats counts below 1000', () => {
    expect(formatViews(1)).toBe('1 views')
    expect(formatViews(500)).toBe('500 views')
    expect(formatViews(999)).toBe('999 views')
  })

  it('formats thousands at exactly 1000', () => {
    expect(formatViews(1000)).toBe('1.0K views')
  })

  it('formats thousands with decimal', () => {
    expect(formatViews(1500)).toBe('1.5K views')
    expect(formatViews(999999)).toBe('1000.0K views')
  })

  it('formats millions at exactly 1,000,000', () => {
    expect(formatViews(1000000)).toBe('1.0M views')
  })

  it('formats millions with decimal', () => {
    expect(formatViews(1500000)).toBe('1.5M views')
    expect(formatViews(10000000)).toBe('10.0M views')
  })
})

describe('formatUploadDate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string for null', () => {
    expect(formatUploadDate(null)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatUploadDate('')).toBe('')
  })

  it('returns empty string for invalid length string', () => {
    expect(formatUploadDate('2024')).toBe('')
    expect(formatUploadDate('202401011')).toBe('')
  })

  it('returns Today for current date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00'))
    expect(formatUploadDate('20250615')).toBe('Today')
  })

  it('returns Yesterday for one day ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00'))
    expect(formatUploadDate('20250614')).toBe('Yesterday')
  })

  it('returns days ago for 2-6 days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00'))
    expect(formatUploadDate('20250613')).toBe('2 days ago')
    expect(formatUploadDate('20250610')).toBe('5 days ago')
  })

  it('returns weeks ago for 7-29 days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00'))
    expect(formatUploadDate('20250608')).toBe('1 weeks ago')
    expect(formatUploadDate('20250601')).toBe('2 weeks ago')
    expect(formatUploadDate('20250518')).toBe('4 weeks ago')
  })

  it('returns formatted date for 30+ days ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00'))
    expect(formatUploadDate('20250101')).toBe('01/01/2025')
    expect(formatUploadDate('20241225')).toBe('25/12/2024')
  })
})
