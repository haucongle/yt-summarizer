// Shared TypeScript types for API contracts

export interface TranscriptResult {
  text: string
  source: 'youtube-vi' | 'youtube-auto' | 'whisper'
  wordCount: number
}

export interface APIError {
  error: string
}

export type SSEEvent =
  | { type: 'status'; message: string }
  | { type: 'transcript_info'; source: string; wordCount: number }
  | { type: 'content'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' }
