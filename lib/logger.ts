type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogMetadata {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  metadata?: LogMetadata
}

const isDevelopment = process.env.NODE_ENV !== 'production'

function formatLogEntry(
  level: LogLevel,
  message: string,
  metadata?: LogMetadata,
): string {
  const timestamp = new Date().toISOString()

  if (isDevelopment) {
    // Pretty-print for development
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    }
    const reset = '\x1b[0m'
    const color = colors[level]
    const levelUpper = level.toUpperCase().padEnd(5)

    let output = `${color}[${levelUpper}]${reset} ${timestamp} ${message}`

    if (metadata && Object.keys(metadata).length > 0) {
      output += `\n  ${JSON.stringify(metadata, null, 2)}`
    }

    return output
  }

  // JSON output for production
  const entry: LogEntry = {
    timestamp,
    level,
    message,
  }

  if (metadata && Object.keys(metadata).length > 0) {
    entry.metadata = metadata
  }

  return JSON.stringify(entry)
}

export function debug(message: string, metadata?: LogMetadata): void {
  const formatted = formatLogEntry('debug', message, metadata)
  console.log(formatted)
}

export function info(message: string, metadata?: LogMetadata): void {
  const formatted = formatLogEntry('info', message, metadata)
  console.log(formatted)
}

export function warn(message: string, metadata?: LogMetadata): void {
  const formatted = formatLogEntry('warn', message, metadata)
  console.error(formatted)
}

export function error(message: string, metadata?: LogMetadata): void {
  const formatted = formatLogEntry('error', message, metadata)
  console.error(formatted)
}
