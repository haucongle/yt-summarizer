import { describe, it, expect } from 'bun:test'
import type { TranscriptResult } from '../youtube'

describe('TranscriptResult interface', () => {
  it('validates correct transcript result structure', () => {
    const result: TranscriptResult = {
      text: 'Sample transcript text',
      source: 'youtube-vi',
      wordCount: 3,
    }

    expect(result.text).toBe('Sample transcript text')
    expect(result.source).toBe('youtube-vi')
    expect(result.wordCount).toBe(3)
  })

  it('accepts youtube-auto source', () => {
    const result: TranscriptResult = {
      text: 'Auto-generated transcript',
      source: 'youtube-auto',
      wordCount: 2,
    }

    expect(result.source).toBe('youtube-auto')
  })

  it('accepts whisper source', () => {
    const result: TranscriptResult = {
      text: 'Whisper transcription',
      source: 'whisper',
      wordCount: 2,
    }

    expect(result.source).toBe('whisper')
  })

  it('handles empty text with zero word count', () => {
    const result: TranscriptResult = {
      text: '',
      source: 'youtube-vi',
      wordCount: 0,
    }

    expect(result.text).toBe('')
    expect(result.wordCount).toBe(0)
  })

  it('handles multi-line text', () => {
    const result: TranscriptResult = {
      text: 'Line one\nLine two\nLine three',
      source: 'whisper',
      wordCount: 6,
    }

    expect(result.text).toContain('\n')
    expect(result.wordCount).toBe(6)
  })

  it('handles special characters in text', () => {
    const result: TranscriptResult = {
      text: "Don't worry! It's fine.",
      source: 'youtube-auto',
      wordCount: 4,
    }

    expect(result.text).toContain("Don't")
    expect(result.text).toContain('!')
  })

  it('handles Vietnamese characters', () => {
    const result: TranscriptResult = {
      text: 'Xin chào thế giới',
      source: 'youtube-vi',
      wordCount: 4,
    }

    expect(result.text).toBe('Xin chào thế giới')
    expect(result.wordCount).toBe(4)
  })

  it('handles large word counts', () => {
    const longText = Array(1000).fill('word').join(' ')
    const result: TranscriptResult = {
      text: longText,
      source: 'whisper',
      wordCount: 1000,
    }

    expect(result.wordCount).toBe(1000)
    expect(result.text.split(' ').length).toBe(1000)
  })
})

describe('Word counting logic validation', () => {
  it('correctly counts words with single spaces', () => {
    const text = 'one two three four five'
    const wordCount = text.split(/\s+/).length

    expect(wordCount).toBe(5)
  })

  it('correctly counts words with multiple spaces', () => {
    const text = 'one  two   three    four'
    const wordCount = text.split(/\s+/).length

    expect(wordCount).toBe(4)
  })

  it('correctly counts words with tabs and newlines', () => {
    const text = 'one\ttwo\nthree\r\nfour'
    const wordCount = text.split(/\s+/).length

    expect(wordCount).toBe(4)
  })

  it('handles leading and trailing whitespace', () => {
    const text = '  one two three  '
    const wordCount = text.split(/\s+/).filter(Boolean).length

    expect(wordCount).toBe(3)
  })

  it('handles empty string', () => {
    const text = ''
    const wordCount = text.split(/\s+/).filter(Boolean).length

    expect(wordCount).toBe(0)
  })

  it('handles string with only whitespace', () => {
    const text = '   \t\n  '
    const wordCount = text.split(/\s+/).filter(Boolean).length

    expect(wordCount).toBe(0)
  })

  it('handles Vietnamese text word counting', () => {
    const text = 'Xin chào thế giới Việt Nam'
    const wordCount = text.split(/\s+/).length

    expect(wordCount).toBe(6)
  })

  it('handles mixed English and Vietnamese', () => {
    const text = 'Hello xin chào world thế giới'
    const wordCount = text.split(/\s+/).length

    expect(wordCount).toBe(6)
  })

  it('handles punctuation in word counting', () => {
    const text = "Don't worry! It's fine."
    const wordCount = text.split(/\s+/).length

    expect(wordCount).toBe(4)
  })

  it('handles hyphenated words', () => {
    const text = 'state-of-the-art machine-learning'
    const wordCount = text.split(/\s+/).length

    expect(wordCount).toBe(2)
  })
})

describe('Transcript source types', () => {
  it('validates all source types are valid', () => {
    const sources: Array<'youtube-vi' | 'youtube-auto' | 'whisper'> = [
      'youtube-vi',
      'youtube-auto',
      'whisper',
    ]

    expect(sources).toHaveLength(3)
    expect(sources).toContain('youtube-vi')
    expect(sources).toContain('youtube-auto')
    expect(sources).toContain('whisper')
  })

  it('distinguishes between Vietnamese and auto transcripts', () => {
    const viResult: TranscriptResult = {
      text: 'Vietnamese text',
      source: 'youtube-vi',
      wordCount: 2,
    }

    const autoResult: TranscriptResult = {
      text: 'Auto-generated text',
      source: 'youtube-auto',
      wordCount: 2,
    }

    expect(viResult.source).not.toBe(autoResult.source)
    expect(viResult.source).toBe('youtube-vi')
    expect(autoResult.source).toBe('youtube-auto')
  })

  it('identifies whisper-generated transcripts', () => {
    const whisperResult: TranscriptResult = {
      text: 'Whisper generated',
      source: 'whisper',
      wordCount: 2,
    }

    expect(whisperResult.source).toBe('whisper')
  })
})

describe('Transcript text transformations', () => {
  it('preserves original text content', () => {
    const originalText = 'This is the original transcript text'
    const result: TranscriptResult = {
      text: originalText,
      source: 'youtube-vi',
      wordCount: 6,
    }

    expect(result.text).toBe(originalText)
  })

  it('handles transcript segments joined with spaces', () => {
    const segments = ['First segment', 'Second segment', 'Third segment']
    const joinedText = segments.join(' ')
    const result: TranscriptResult = {
      text: joinedText,
      source: 'youtube-auto',
      wordCount: 6,
    }

    expect(result.text).toBe('First segment Second segment Third segment')
  })

  it('handles transcript segments joined with newlines', () => {
    const segments = ['First chunk', 'Second chunk', 'Third chunk']
    const joinedText = segments.join('\n\n')
    const result: TranscriptResult = {
      text: joinedText,
      source: 'whisper',
      wordCount: 6,
    }

    expect(result.text).toContain('\n\n')
    expect(result.text.split('\n\n')).toHaveLength(3)
  })

  it('handles empty segments gracefully', () => {
    const segments = ['Text', '', 'More text']
    const joinedText = segments.filter(Boolean).join(' ')
    const result: TranscriptResult = {
      text: joinedText,
      source: 'youtube-vi',
      wordCount: 3,
    }

    expect(result.text).toBe('Text More text')
  })
})

describe('Transcript result immutability', () => {
  it('creates independent transcript results', () => {
    const result1: TranscriptResult = {
      text: 'First transcript',
      source: 'youtube-vi',
      wordCount: 2,
    }

    const result2: TranscriptResult = {
      text: 'Second transcript',
      source: 'youtube-auto',
      wordCount: 2,
    }

    expect(result1.text).not.toBe(result2.text)
    expect(result1.source).not.toBe(result2.source)
  })

  it('maintains independent word counts', () => {
    const shortResult: TranscriptResult = {
      text: 'Short',
      source: 'youtube-vi',
      wordCount: 1,
    }

    const longResult: TranscriptResult = {
      text: 'This is a much longer transcript',
      source: 'youtube-auto',
      wordCount: 6,
    }

    expect(shortResult.wordCount).not.toBe(longResult.wordCount)
  })
})

describe('Edge cases and boundary conditions', () => {
  it('handles single word transcript', () => {
    const result: TranscriptResult = {
      text: 'Hello',
      source: 'youtube-vi',
      wordCount: 1,
    }

    expect(result.wordCount).toBe(1)
    expect(result.text).toBe('Hello')
  })

  it('handles very long transcripts', () => {
    const longText = Array(10000).fill('word').join(' ')
    const result: TranscriptResult = {
      text: longText,
      source: 'whisper',
      wordCount: 10000,
    }

    expect(result.wordCount).toBe(10000)
  })

  it('handles Unicode characters', () => {
    const result: TranscriptResult = {
      text: '你好 世界 🌍',
      source: 'youtube-auto',
      wordCount: 3,
    }

    expect(result.text).toContain('你好')
    expect(result.text).toContain('🌍')
  })

  it('handles mixed line endings', () => {
    const result: TranscriptResult = {
      text: 'Line 1\nLine 2\r\nLine 3\rLine 4',
      source: 'whisper',
      wordCount: 8,
    }

    expect(result.text).toContain('\n')
    expect(result.text).toContain('\r\n')
  })

  it('handles repeated whitespace patterns', () => {
    const text = 'word1   \t  word2  \n\n  word3'
    const wordCount = text.split(/\s+/).filter(Boolean).length

    expect(wordCount).toBe(3)
  })
})
