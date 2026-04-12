import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'

const DEFAULT_MS = 480

type UseLongPressOptions = {
  /** 为 false 时不启用手势（例如桌面端） */
  enabled: boolean
  ms?: number
  /** 仅触摸指针触发长按，避免误伤鼠标拖拽 */
  touchOnly?: boolean
  onLongPress: () => void
}

/**
 * 触摸长按；若触发长按，应通过 consumeClick() 在紧随的 click 中吞掉导航。
 */
export function useLongPress({
  enabled,
  ms = DEFAULT_MS,
  touchOnly = true,
  onLongPress,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClickRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<Element>) => {
      if (!enabled) return
      if (touchOnly && e.pointerType !== 'touch') return
      suppressClickRef.current = false
      clearTimer()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        suppressClickRef.current = true
        try {
          navigator.vibrate?.(12)
        } catch {
          /* ignore */
        }
        onLongPress()
      }, ms)
    },
    [enabled, touchOnly, ms, onLongPress, clearTimer],
  )

  const onPointerEnd = useCallback(() => {
    clearTimer()
  }, [clearTimer])

  const consumeClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return true
    }
    return false
  }, [])

  return {
    onPointerDown,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onPointerLeave: onPointerEnd,
    consumeClick,
  }
}
