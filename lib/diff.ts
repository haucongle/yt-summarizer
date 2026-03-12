export type DiffLine =
  | { type: 'equal'; left: string; right: string; leftNum: number; rightNum: number }
  | { type: 'removed'; left: string; leftNum: number }
  | { type: 'added'; right: string; rightNum: number }

export function computeDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split('\n')
  const linesB = b.split('\n')
  const m = linesA.length
  const n = linesB.length

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (linesA[i] === linesB[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  const result: DiffLine[] = []
  let i = 0, j = 0
  let leftNum = 1, rightNum = 1

  while (i < m || j < n) {
    if (i < m && j < n && linesA[i] === linesB[j]) {
      result.push({ type: 'equal', left: linesA[i], right: linesB[j], leftNum: leftNum++, rightNum: rightNum++ })
      i++; j++
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: 'added', right: linesB[j], rightNum: rightNum++ })
      j++
    } else if (i < m) {
      result.push({ type: 'removed', left: linesA[i], leftNum: leftNum++ })
      i++
    }
  }

  return result
}
