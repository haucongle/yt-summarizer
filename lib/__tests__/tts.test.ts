import { describe, it, expect } from 'bun:test'
import { splitTextIntoChunks } from '../tts-utils'

const MAX_CHUNK_LENGTH = 1000

describe('splitTextIntoChunks', () => {
  it('returns short text as a single chunk', () => {
    const result = splitTextIntoChunks('Hello, this is a short text.')
    expect(result).toEqual(['Hello, this is a short text.'])
  })

  it('returns single empty-string chunk for empty string input', () => {
    const result = splitTextIntoChunks('')
    expect(result).toEqual([''])
  })

  it('returns single empty-string chunk for whitespace-only input', () => {
    const result = splitTextIntoChunks('   \n\n  \t  ')
    expect(result).toEqual([''])
  })

  it('strips markdown headers', () => {
    const result = splitTextIntoChunks('# Heading 1\n## Heading 2\n### Heading 3')
    expect(result).toEqual(['Heading 1\nHeading 2\nHeading 3'])
    // Verify no '#' characters remain from headers
    expect(result[0]).not.toMatch(/^#+\s/m)
  })

  it('strips bold and italic markdown', () => {
    const result = splitTextIntoChunks('This is **bold** and *italic* text.')
    expect(result).toEqual(['This is bold and italic text.'])
  })

  it('strips inline code markdown', () => {
    const result = splitTextIntoChunks('Use the `console.log` function.')
    expect(result).toEqual(['Use the console.log function.'])
  })

  it('strips markdown links, keeping link text', () => {
    const result = splitTextIntoChunks('Visit [Google](https://google.com) for more info.')
    expect(result).toEqual(['Visit Google for more info.'])
  })

  it('strips unordered list markers (- and *)', () => {
    const result = splitTextIntoChunks('- First item\n- Second item\n* Third item')
    expect(result).toEqual(['First item\nSecond item\nThird item'])
  })

  it('strips ordered list markers', () => {
    const result = splitTextIntoChunks('1. First item\n2. Second item\n3. Third item')
    expect(result).toEqual(['First item\nSecond item\nThird item'])
  })

  it('collapses excessive newlines to double newlines', () => {
    const result = splitTextIntoChunks('Paragraph one.\n\n\n\n\nParagraph two.')
    expect(result).toEqual(['Paragraph one.\n\nParagraph two.'])
  })

  it('strips all markdown types in combination', () => {
    const input = [
      '# Main Title',
      '',
      'This is **bold** and *italic* with `code`.',
      '',
      '- [Link text](https://example.com)',
      '1. Ordered item',
    ].join('\n')

    const result = splitTextIntoChunks(input)
    expect(result).toHaveLength(1)
    expect(result[0]).not.toContain('**')
    expect(result[0]).not.toContain('`')
    expect(result[0]).not.toContain('](')
    expect(result[0]).toContain('Link text')
    expect(result[0]).toContain('bold')
    expect(result[0]).toContain('italic')
    expect(result[0]).toContain('code')
  })

  it('returns single chunk for text exactly at MAX_CHUNK_LENGTH', () => {
    // Build a string of exactly 4000 characters
    const text = 'a'.repeat(MAX_CHUNK_LENGTH)
    const result = splitTextIntoChunks(text)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(MAX_CHUNK_LENGTH)
  })

  it('splits long text at sentence boundaries (". ")', () => {
    const firstPart = 'A'.repeat(750) + '. '
    const secondPart = 'B'.repeat(500)
    const text = firstPart + secondPart

    const result = splitTextIntoChunks(text)
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result[0]).toContain('A'.repeat(100))
    expect(result[1]).toContain('B'.repeat(100))
  })

  it('splits long text at paragraph boundaries ("\\n\\n")', () => {
    const paragraph1 = 'First paragraph content. '.repeat(25) // ~625 chars
    const paragraph2 = 'Second paragraph content. '.repeat(25)
    const text = paragraph1.trim() + '\n\n' + paragraph2.trim()

    const result = splitTextIntoChunks(text)
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('falls back to space splitting when no natural break points exist after 30%', () => {
    const word = 'word '
    const text = word.repeat(Math.ceil((MAX_CHUNK_LENGTH + 200) / word.length))

    const result = splitTextIntoChunks(text)
    expect(result.length).toBeGreaterThanOrEqual(2)
    // All chunks should be within limits
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_LENGTH)
    }
  })

  it('falls back to hard split when no spaces exist', () => {
    const text = 'x'.repeat(MAX_CHUNK_LENGTH + 200)

    const result = splitTextIntoChunks(text)
    expect(result.length).toBeGreaterThanOrEqual(2)
    // First chunk should be exactly MAX_CHUNK_LENGTH since there's no break point
    expect(result[0]).toHaveLength(MAX_CHUNK_LENGTH)
  })

  it('produces multiple chunks for very long text', () => {
    // Create text that requires 3+ chunks, using sentences for predictable splitting
    const sentence = 'This is a complete sentence. '
    const text = sentence.repeat(Math.ceil((MAX_CHUNK_LENGTH * 3) / sentence.length))

    const result = splitTextIntoChunks(text)
    expect(result.length).toBeGreaterThanOrEqual(3)
    // Every chunk should respect the max length
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_LENGTH)
    }
  })

  it('preserves all content across chunks (no data loss)', () => {
    // Build text from known words, verify all words appear in the reassembled output
    const words = Array.from({ length: 500 }, (_, i) => `word${i}`)
    const text = words.join(' ')

    const result = splitTextIntoChunks(text)
    const reassembled = result.join(' ')
    for (const word of words) {
      expect(reassembled).toContain(word)
    }
  })

  it('filters out empty chunks', () => {
    const result = splitTextIntoChunks('Hello world.')
    for (const chunk of result) {
      expect(chunk.length).toBeGreaterThan(0)
    }
  })
})
