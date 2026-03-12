import { describe, it, expect } from 'bun:test'
import { computeDiff } from '../diff'

describe('computeDiff', () => {
  it('returns all equal lines for identical inputs', () => {
    const result = computeDiff('hello\nworld', 'hello\nworld')
    expect(result).toEqual([
      { type: 'equal', left: 'hello', right: 'hello', leftNum: 1, rightNum: 1 },
      { type: 'equal', left: 'world', right: 'world', leftNum: 2, rightNum: 2 },
    ])
  })

  it('returns all removed and added lines for completely different inputs', () => {
    const result = computeDiff('alpha\nbeta', 'gamma\ndelta')
    expect(result).toHaveLength(4)
    const removed = result.filter((l) => l.type === 'removed')
    const added = result.filter((l) => l.type === 'added')
    expect(removed).toHaveLength(2)
    expect(added).toHaveLength(2)
    expect(removed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'removed', left: 'alpha' }),
        expect.objectContaining({ type: 'removed', left: 'beta' }),
      ]),
    )
    expect(added).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'added', right: 'gamma' }),
        expect.objectContaining({ type: 'added', right: 'delta' }),
      ]),
    )
  })

  it('detects a single-line addition', () => {
    const result = computeDiff('a\nb', 'a\nc\nb')
    expect(result).toEqual([
      { type: 'equal', left: 'a', right: 'a', leftNum: 1, rightNum: 1 },
      { type: 'added', right: 'c', rightNum: 2 },
      { type: 'equal', left: 'b', right: 'b', leftNum: 2, rightNum: 3 },
    ])
  })

  it('detects a single-line removal', () => {
    const result = computeDiff('a\nc\nb', 'a\nb')
    expect(result).toEqual([
      { type: 'equal', left: 'a', right: 'a', leftNum: 1, rightNum: 1 },
      { type: 'removed', left: 'c', leftNum: 2 },
      { type: 'equal', left: 'b', right: 'b', leftNum: 3, rightNum: 2 },
    ])
  })

  it('handles mixed additions and removals', () => {
    const result = computeDiff('a\nb\nc', 'a\nx\nc')
    expect(result).toHaveLength(4)
    expect(result[0]).toEqual({
      type: 'equal', left: 'a', right: 'a', leftNum: 1, rightNum: 1,
    })
    const middle = result.slice(1, 3)
    const types = middle.map((l) => l.type)
    expect(types).toContain('added')
    expect(types).toContain('removed')
    expect(result[3]).toEqual({
      type: 'equal', left: 'c', right: 'c', leftNum: 3, rightNum: 3,
    })
  })

  it('handles both inputs empty (single empty-string line each)', () => {
    const result = computeDiff('', '')
    expect(result).toEqual([
      { type: 'equal', left: '', right: '', leftNum: 1, rightNum: 1 },
    ])
  })

  it('handles one empty input (left empty, right has content)', () => {
    const result = computeDiff('', 'hello')
    const added = result.filter((l) => l.type === 'added')
    expect(added.length).toBeGreaterThanOrEqual(1)
    expect(added).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'added', right: 'hello' }),
      ]),
    )
  })

  it('handles one empty input (left has content, right empty)', () => {
    const result = computeDiff('hello', '')
    const removed = result.filter((l) => l.type === 'removed')
    expect(removed.length).toBeGreaterThanOrEqual(1)
    expect(removed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'removed', left: 'hello' }),
      ]),
    )
  })

  it('tracks line numbers correctly across additions and removals', () => {
    const result = computeDiff('a\nb\nc\nd', 'a\nx\nc\ny\nd')
    // a is equal (L1, R1)
    // b removed (L2), x added (R2)
    // c equal (L3, R3)
    // y added (R4)
    // d equal (L4, R5)
    const equalLines = result.filter((l) => l.type === 'equal')
    expect(equalLines[0]).toEqual(
      expect.objectContaining({ left: 'a', leftNum: 1, rightNum: 1 }),
    )
    expect(equalLines[1]).toEqual(
      expect.objectContaining({ left: 'c', leftNum: 3, rightNum: 3 }),
    )
    expect(equalLines[2]).toEqual(
      expect.objectContaining({ left: 'd', leftNum: 4, rightNum: 5 }),
    )
  })

  it('handles a multiline real-world example', () => {
    const before = [
      'function greet(name) {',
      '  console.log("Hello, " + name);',
      '  return true;',
      '}',
    ].join('\n')

    const after = [
      'function greet(name) {',
      '  const message = `Hello, ${name}`;',
      '  console.log(message);',
      '  return true;',
      '}',
    ].join('\n')

    const result = computeDiff(before, after)

    // First and last two lines are equal
    expect(result[0]).toEqual(
      expect.objectContaining({ type: 'equal', left: 'function greet(name) {' }),
    )

    const lastTwo = result.slice(-2)
    expect(lastTwo[0]).toEqual(
      expect.objectContaining({ type: 'equal', left: '  return true;' }),
    )
    expect(lastTwo[1]).toEqual(
      expect.objectContaining({ type: 'equal', left: '}' }),
    )

    // Middle should have removed and added lines
    const middle = result.slice(1, -2)
    const removedLines = middle.filter((l) => l.type === 'removed')
    const addedLines = middle.filter((l) => l.type === 'added')
    expect(removedLines.length).toBeGreaterThanOrEqual(1)
    expect(addedLines.length).toBeGreaterThanOrEqual(1)

    // The removed line should be the old console.log
    expect(removedLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ left: '  console.log("Hello, " + name);' }),
      ]),
    )

    // The added lines should include the new template literal and console.log
    expect(addedLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ right: '  const message = `Hello, ${name}`;' }),
        expect.objectContaining({ right: '  console.log(message);' }),
      ]),
    )
  })
})
