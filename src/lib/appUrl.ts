/** 应用对外完整根 URL（含 Vite base，例如 /OutFlow/） */
export function getAppBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  if (typeof window === 'undefined') return base
  return new URL(base, window.location.origin).href
}

/** 是否以「添加到主屏幕」的独立 PWA 方式打开 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  )
}
