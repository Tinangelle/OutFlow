export function blockPreview(content: string, maxLines = 4): string {
  const normalized = content.replace(/\r\n/g, '\n').trim()
  if (!normalized) return '（空）'
  const lines = normalized.split('\n')
  const slice = lines.slice(0, maxLines)
  const text = slice.join('\n')
  return lines.length > maxLines ? `${text}…` : text
}
