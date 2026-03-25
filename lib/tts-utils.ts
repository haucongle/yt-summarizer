const MAX_CHUNK_LENGTH = 1000
const MIN_TTS_CHUNK = 200

export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function splitTextIntoChunks(text: string): string[] {
  const stripped = stripMarkdown(text)
  if (stripped.length <= MAX_CHUNK_LENGTH) return [stripped]

  const chunks: string[] = []
  let remaining = stripped

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK_LENGTH) {
      chunks.push(remaining)
      break
    }

    const slice = remaining.substring(0, MAX_CHUNK_LENGTH)

    let splitAt = -1
    for (const sep of ['\n\n', '.\n', '. ', '! ', '? ', ';\n', '; ', ',\n', ', ', '\n']) {
      const idx = slice.lastIndexOf(sep)
      if (idx > MAX_CHUNK_LENGTH * 0.3) {
        splitAt = idx + sep.length
        break
      }
    }

    if (splitAt === -1) {
      splitAt = slice.lastIndexOf(' ')
      if (splitAt === -1) splitAt = MAX_CHUNK_LENGTH
    }

    chunks.push(remaining.substring(0, splitAt).trim())
    remaining = remaining.substring(splitAt).trim()
  }

  return chunks.filter(Boolean)
}

/**
 * Extracts a TTS-ready chunk from accumulated streaming text.
 * Returns null if not enough text has accumulated at a good boundary.
 */
export function extractTtsChunk(
  buffer: string,
): { chunk: string; remaining: string } | null {
  if (buffer.length < MIN_TTS_CHUNK) return null

  const searchEnd = Math.min(buffer.length, MAX_CHUNK_LENGTH)
  const searchArea = buffer.substring(0, searchEnd)

  const separators = ['\n\n', '.\n', '. ', '! ', '? ']
  let splitAt = -1

  for (const sep of separators) {
    const idx = searchArea.lastIndexOf(sep)
    if (idx >= MIN_TTS_CHUNK * 0.5) {
      splitAt = idx + sep.length
      break
    }
  }

  if (splitAt === -1 && buffer.length > MAX_CHUNK_LENGTH) {
    splitAt = searchArea.lastIndexOf(' ')
    if (splitAt === -1) splitAt = MAX_CHUNK_LENGTH
  }

  if (splitAt === -1) return null

  const chunk = stripMarkdown(buffer.substring(0, splitAt).trim())
  const remaining = buffer.substring(splitAt)

  if (!chunk) return null
  return { chunk, remaining }
}
