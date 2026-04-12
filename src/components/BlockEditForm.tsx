import { useLayoutEffect, useRef, useState } from 'react'
import type { Block } from '../types/outflow'

const shellClass: Record<'bubble' | 'document', string> = {
  bubble:
    'rounded-2xl border border-violet-300 bg-white p-3 shadow-sm dark:border-violet-600 dark:bg-zinc-900',
  document:
    'rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90',
}

export function BlockEditForm({
  block,
  onSave,
  variant = 'bubble',
}: {
  block: Block
  onSave: (id: string, content: string) => void
  variant?: 'bubble' | 'document'
}) {
  const [draft, setDraft] = useState(() => block.content)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [])

  return (
    <div className={shellClass[variant]}>
      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onSave(block.id, draft)
          }
        }}
        onBlur={() => onSave(block.id, draft)}
        rows={1}
        className="max-h-[min(60vh,24rem)] w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-relaxed text-zinc-900 outline-none dark:text-zinc-100"
        aria-label="编辑内容块"
      />
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Cmd/Ctrl + Enter 保存并退出编辑
      </p>
    </div>
  )
}
