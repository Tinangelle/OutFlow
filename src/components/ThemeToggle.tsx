import { Moon, Sun } from 'lucide-react'
import { useOutflow } from '../hooks/useOutflow'

export function ThemeToggle() {
  const { theme, setTheme } = useOutflow()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      title={isDark ? '切换为浅色' : '切换为深色'}
      aria-label={isDark ? '切换为浅色模式' : '切换为深色模式'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
