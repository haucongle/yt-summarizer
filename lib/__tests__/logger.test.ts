import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test'

describe('logger', () => {
  let consoleLogMock: ReturnType<typeof mock>
  let consoleErrorMock: ReturnType<typeof mock>
  let originalNodeEnv: string | undefined

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV
    consoleLogMock = mock(() => {})
    consoleErrorMock = mock(() => {})
    console.log = consoleLogMock
    console.error = consoleErrorMock
  })

  afterAll(() => {
    consoleLogMock.mockRestore()
    consoleErrorMock.mockRestore()
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('debug', () => {
    it('calls console.log with formatted message', async () => {
      const { debug } = await import('../logger')
      debug('test message')
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('test message')
    })

    it('includes metadata when provided', async () => {
      const { debug } = await import('../logger')
      debug('test message', { key: 'value' })
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('test message')
      expect(output).toContain('key')
    })

    it('formats with debug level indicator', async () => {
      const { debug } = await import('../logger')
      debug('debug test')
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('DEBUG')
      expect(output).toContain('debug test')
    })

    it('includes cyan color code for debug level', async () => {
      const { debug } = await import('../logger')
      debug('color test')
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('\x1b[36m') // Cyan color
    })

    it('handles empty metadata object', async () => {
      const { debug } = await import('../logger')
      debug('test message', {})
      expect(consoleLogMock).toHaveBeenCalled()
    })
  })

  describe('info', () => {
    it('calls console.log with formatted message', async () => {
      const { info } = await import('../logger')
      info('info message')
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('info message')
    })

    it('includes metadata when provided', async () => {
      const { info } = await import('../logger')
      info('info message', { status: 'success' })
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('info message')
      expect(output).toContain('status')
    })

    it('formats with info level indicator', async () => {
      const { info } = await import('../logger')
      info('info test')
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('INFO')
      expect(output).toContain('info test')
    })

    it('includes green color code for info level', async () => {
      const { info } = await import('../logger')
      info('color test')
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('\x1b[32m') // Green color
    })
  })

  describe('warn', () => {
    it('calls console.error with formatted message', async () => {
      const { warn } = await import('../logger')
      warn('warning message')
      expect(consoleErrorMock).toHaveBeenCalled()
      const output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('warning message')
    })

    it('includes metadata when provided', async () => {
      const { warn } = await import('../logger')
      warn('warning message', { reason: 'timeout' })
      expect(consoleErrorMock).toHaveBeenCalled()
      const output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('warning message')
      expect(output).toContain('reason')
    })

    it('formats with warn level indicator', async () => {
      const { warn } = await import('../logger')
      warn('warn test')
      expect(consoleErrorMock).toHaveBeenCalled()
      const output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('WARN')
      expect(output).toContain('warn test')
    })

    it('includes yellow color code for warn level', async () => {
      const { warn } = await import('../logger')
      warn('color test')
      expect(consoleErrorMock).toHaveBeenCalled()
      const output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('\x1b[33m') // Yellow color
    })
  })

  describe('error', () => {
    it('calls console.error with formatted message', async () => {
      const { error } = await import('../logger')
      error('error message')
      expect(consoleErrorMock).toHaveBeenCalled()
      const output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('error message')
    })

    it('includes metadata when provided', async () => {
      const { error } = await import('../logger')
      error('error message', { stack: 'trace' })
      expect(consoleErrorMock).toHaveBeenCalled()
      const output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('error message')
      expect(output).toContain('stack')
    })

    it('formats with error level indicator', async () => {
      const { error } = await import('../logger')
      error('error test')
      expect(consoleErrorMock).toHaveBeenCalled()
      const output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('ERROR')
      expect(output).toContain('error test')
    })

    it('includes red color code for error level', async () => {
      const { error } = await import('../logger')
      error('color test')
      expect(consoleErrorMock).toHaveBeenCalled()
      const output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('\x1b[31m') // Red color
    })
  })

  describe('metadata handling', () => {
    it('handles complex nested metadata', async () => {
      const { info } = await import('../logger')
      const metadata = {
        user: { id: 1, name: 'test' },
        items: [1, 2, 3],
        flag: true,
      }
      info('complex metadata', metadata)
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('complex metadata')
      expect(output).toContain('user')
      expect(output).toContain('items')
    })

    it('handles metadata with various data types', async () => {
      const { info } = await import('../logger')
      const metadata = {
        string: 'value',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
      }
      info('type test', metadata)
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('type test')
    })

    it('handles logs without metadata', async () => {
      const { info } = await import('../logger')
      info('no metadata')
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('no metadata')
    })

    it('handles null values in metadata', async () => {
      const { info } = await import('../logger')
      info('null test', { nullValue: null })
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toContain('null test')
    })
  })

  describe('timestamp', () => {
    it('includes ISO timestamp in output', async () => {
      const { info } = await import('../logger')
      info('test')
      expect(consoleLogMock).toHaveBeenCalled()
      const output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/,
      )
    })

    it('timestamps are in ISO format for all log levels', async () => {
      const { debug, info, warn, error } = await import('../logger')
      const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/

      debug('timestamp test')
      let output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toMatch(isoRegex)

      info('timestamp test')
      output = consoleLogMock.mock.calls[
        consoleLogMock.mock.calls.length - 1
      ][0]
      expect(output).toMatch(isoRegex)

      warn('timestamp test')
      output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toMatch(isoRegex)

      error('timestamp test')
      output = consoleErrorMock.mock.calls[
        consoleErrorMock.mock.calls.length - 1
      ][0]
      expect(output).toMatch(isoRegex)
    })
  })
})
