import { useEffect, useState } from 'react'

/** 与 Tailwind `md` 断点一致：宽度小于 768px 视为窄屏（移动端侧栏布局） */
export function useMediaNarrowMd() {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return narrow
}
