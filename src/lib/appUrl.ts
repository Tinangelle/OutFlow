/** 应用对外完整根 URL（含 Vite base，例如 /OutFlow/） */
export function getAppBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  if (typeof window === 'undefined') return base
  return new URL(base, window.location.origin).href
}
