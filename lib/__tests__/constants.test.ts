import { describe, it, expect } from 'bun:test'
import { TIMEOUTS, AUDIO, MODELS, TOKENS, FORMATTING } from '../constants'

describe('TIMEOUTS', () => {
  it('exports timeout constants object', () => {
    expect(TIMEOUTS).toBeDefined()
    expect(typeof TIMEOUTS).toBe('object')
  })

  it('has YT_DLP_SUBTITLE timeout of 30 seconds', () => {
    expect(TIMEOUTS.YT_DLP_SUBTITLE).toBe(30_000)
  })

  it('has YT_DLP_AUDIO timeout of 10 minutes', () => {
    expect(TIMEOUTS.YT_DLP_AUDIO).toBe(600_000)
  })

  it('has FFMPEG_SPLIT timeout of 5 minutes', () => {
    expect(TIMEOUTS.FFMPEG_SPLIT).toBe(300_000)
  })
})

describe('AUDIO', () => {
  it('exports audio configuration object', () => {
    expect(AUDIO).toBeDefined()
    expect(typeof AUDIO).toBe('object')
  })

  it('has MAX_SINGLE_FILE_MB of 24', () => {
    expect(AUDIO.MAX_SINGLE_FILE_MB).toBe(24)
  })

  it('has SEGMENT_DURATION_SEC of 300', () => {
    expect(AUDIO.SEGMENT_DURATION_SEC).toBe(300)
  })

  it('has WHISPER_CONCURRENCY of 5', () => {
    expect(AUDIO.WHISPER_CONCURRENCY).toBe(5)
  })
})

describe('MODELS', () => {
  it('exports model identifiers object', () => {
    expect(MODELS).toBeDefined()
    expect(typeof MODELS).toBe('object')
  })

  it('has GPT model identifier', () => {
    expect(MODELS.GPT).toBe('gpt-5.4')
  })

  it('has WHISPER model identifier', () => {
    expect(MODELS.WHISPER).toBe('whisper-1')
  })
})

describe('TOKENS', () => {
  it('exports token limits object', () => {
    expect(TOKENS).toBeDefined()
    expect(typeof TOKENS).toBe('object')
  })

  it('has SUMMARIZE_MAX of 16384', () => {
    expect(TOKENS.SUMMARIZE_MAX).toBe(16384)
  })

  it('has TRANSLATE_MAX of 4096', () => {
    expect(TOKENS.TRANSLATE_MAX).toBe(4096)
  })
})

describe('FORMATTING', () => {
  it('exports formatting constants object', () => {
    expect(FORMATTING).toBeDefined()
    expect(typeof FORMATTING).toBe('object')
  })

  it('has MILLION as 1,000,000', () => {
    expect(FORMATTING.MILLION).toBe(1_000_000)
  })

  it('has THOUSAND as 1,000', () => {
    expect(FORMATTING.THOUSAND).toBe(1_000)
  })

  it('has SECONDS_PER_MINUTE as 60', () => {
    expect(FORMATTING.SECONDS_PER_MINUTE).toBe(60)
  })

  it('has SECONDS_PER_HOUR as 3600', () => {
    expect(FORMATTING.SECONDS_PER_HOUR).toBe(3600)
  })
})
