export function generateId(): string {
  // 优先使用原生的 randomUUID (如果是 HTTPS 或 localhost)
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  // Fallback: 如果原生方法不可用，使用时间戳 + 随机字符串生成唯一 ID
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).substring(2, 9)
  )
}
