import { describe, it, expect } from 'vitest'
import { extractVideoId, parseSrt } from '../youtube'

describe('extractVideoId', () => {
  it('extracts ID from standard YouTube URL', () => {
    expect(
      extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from short YouTube URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
  })

  it('extracts ID from embed URL', () => {
    expect(
      extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from shorts URL', () => {
    expect(
      extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('extracts bare 11-character ID', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from URL with extra params', () => {
    expect(
      extractVideoId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
      ),
    ).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from URL with URL-encoded characters', () => {
    expect(
      extractVideoId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share%26other',
      ),
    ).toBe('dQw4w9WgXcQ')
  })

  it('returns null for empty string', () => {
    expect(extractVideoId('')).toBeNull()
  })

  it('returns null for random text', () => {
    expect(extractVideoId('not-a-url-at-all')).toBeNull()
  })

  it('returns null for wrong-length bare IDs', () => {
    expect(extractVideoId('dQw4w9WgXc')).toBeNull() // 10 chars
    expect(extractVideoId('dQw4w9WgXcQx')).toBeNull() // 12 chars
  })

  it('returns null for wrong domain', () => {
    expect(
      extractVideoId('https://www.vimeo.com/watch?v=dQw4w9WgXcQ'),
    ).toBeNull()
  })

  it('handles IDs with hyphens and underscores', () => {
    expect(extractVideoId('abc-_def12A')).toBe('abc-_def12A')
    expect(
      extractVideoId('https://youtu.be/abc-_def12A'),
    ).toBe('abc-_def12A')
  })
})

describe('parseSrt', () => {
  it('parses standard SRT with timestamps into plain text', () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,000 --> 00:00:08,000
This is a test`

    expect(parseSrt(srt)).toBe('Hello world This is a test')
  })

  it('strips HTML tags from subtitles', () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
<font color="#ffffff">Hello</font> <i>world</i>`

    expect(parseSrt(srt)).toBe('Hello world')
  })

  it('returns empty string for empty input', () => {
    expect(parseSrt('')).toBe('')
  })

  it('handles multiple subtitle blocks', () => {
    const srt = `1
00:00:01,000 --> 00:00:02,000
First line

2
00:00:03,000 --> 00:00:04,000
Second line

3
00:00:05,000 --> 00:00:06,000
Third line`

    expect(parseSrt(srt)).toBe('First line Second line Third line')
  })

  it('handles carriage returns (\\r\\n line endings)', () => {
    const srt =
      '1\r\n00:00:01,000 --> 00:00:04,000\r\nHello world\r\n\r\n2\r\n00:00:05,000 --> 00:00:08,000\r\nGoodbye world'

    expect(parseSrt(srt)).toBe('Hello world Goodbye world')
  })

  it('handles timestamps with dot separators', () => {
    const srt = `1
00:00:01.000 --> 00:00:04.000
Dot separator test`

    expect(parseSrt(srt)).toBe('Dot separator test')
  })

  it('handles multiline subtitle text within a single block', () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
Line one
Line two`

    expect(parseSrt(srt)).toBe('Line one Line two')
  })
})
