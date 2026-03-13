/**
 * Centralized constants for timeouts, model names, limits, and formatting values.
 * All magic numbers and strings extracted from the codebase for better maintainability.
 */

/**
 * Timeout values for external command operations (in milliseconds)
 */
export const TIMEOUTS = {
  /** Timeout for yt-dlp subtitle extraction (30 seconds) */
  YT_DLP_SUBTITLE: 30_000,
  /** Timeout for yt-dlp audio download (10 minutes) */
  YT_DLP_AUDIO: 600_000,
  /** Timeout for ffmpeg audio splitting (5 minutes) */
  FFMPEG_SPLIT: 300_000,
} as const

/**
 * Audio processing configuration
 */
export const AUDIO = {
  /** Maximum file size (MB) before splitting into chunks */
  MAX_SINGLE_FILE_MB: 24,
  /** Duration of each audio segment in seconds (5 minutes) */
  SEGMENT_DURATION_SEC: 300,
  /** Number of concurrent Whisper transcription requests */
  WHISPER_CONCURRENCY: 5,
} as const

/**
 * AI model identifiers
 */
export const MODELS = {
  /** GPT model for summarization and translation */
  GPT: 'gpt-5.4',
  /** Whisper model for audio transcription */
  WHISPER: 'whisper-1',
} as const

/**
 * Token limits for API requests
 */
export const TOKENS = {
  /** Maximum tokens for summarization requests */
  SUMMARIZE_MAX: 16384,
  /** Maximum tokens for translation requests */
  TRANSLATE_MAX: 4096,
} as const

/**
 * Formatting constants for number and time conversions
 */
export const FORMATTING = {
  /** One million, used for view count formatting */
  MILLION: 1_000_000,
  /** One thousand, used for view count formatting */
  THOUSAND: 1_000,
  /** Seconds per minute (60) */
  SECONDS_PER_MINUTE: 60,
  /** Seconds per hour (3600) */
  SECONDS_PER_HOUR: 3600,
  /** Milliseconds per second (1000) */
  MILLISECONDS_PER_SECOND: 1000,
  /** Milliseconds per day (86,400,000) */
  MILLISECONDS_PER_DAY: 1000 * 60 * 60 * 24,
  /** Days per week (7) */
  DAYS_PER_WEEK: 7,
  /** Days per month approximation (30) */
  DAYS_PER_MONTH_APPROX: 30,
  /** Decimal places for view count formatting (1) */
  DECIMAL_PLACES: 1,
  /** Padding width for time formatting (2) */
  PAD_WIDTH: 2,
  /** Padding character for time formatting ('0') */
  PAD_CHAR: '0',
  /** Expected date string length for YYYYMMDD format (8) */
  DATE_STRING_LENGTH: 8,
  /** Year substring start index (0) */
  YEAR_START: 0,
  /** Year substring end index (4) */
  YEAR_END: 4,
  /** Month substring start index (4) */
  MONTH_START: 4,
  /** Month substring end index (6) */
  MONTH_END: 6,
  /** Day substring start index (6) */
  DAY_START: 6,
  /** Day substring end index (8) */
  DAY_END: 8,
} as const
