const mixedWordRegex = /[\u4e00-\u9fa5]|\b[a-zA-Z0-9]+\b/g

/**
 * 中英混合词数统计：
 * - 中文单字计 1
 * - 英文/数字连续词计 1
 */
export function calculateWordCount(text: string): number {
  if (!text) return 0
  const matches = text.match(mixedWordRegex)
  return matches ? matches.length : 0
}

/** 兼容旧调用 */
export const countMixedWords = calculateWordCount
