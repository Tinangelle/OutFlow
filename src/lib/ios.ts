/**
 * iPhone / iPad / iPod; includes iPadOS 13+ that may report a desktop User-Agent.
 * Used to align read/edit typography: Safari will zoom focused inputs with font-size under 16px.
 */
export function getIsIOSLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iP(hone|ad|od)/.test(ua)) return true
  if (navigator.maxTouchPoints > 1 && /MacIntel|Macintosh/.test(ua)) {
    return true
  }
  return false
}
