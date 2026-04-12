/** 从正文提取 【词】 与 #词 标签，按首次出现顺序去重 */
export function extractTagsFromContent(content: string): string[] {
  const bracketRe = /【([^】]*)】/g
  const hashRe = /#([^\s#【】]+)/g
  const seen = new Set<string>()
  const ordered: string[] = []

  const add = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    if (seen.has(t)) return
    seen.add(t)
    ordered.push(t)
  }

  for (const m of content.matchAll(bracketRe)) {
    add(m[1] ?? '')
  }
  for (const m of content.matchAll(hashRe)) {
    add(m[1] ?? '')
  }
  return ordered
}
