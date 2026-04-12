import { useLayoutEffect, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import {
  plainTextFieldNames,
  plainTextFieldProps,
} from '../lib/plain-text-field-props'
import type { Block } from '../types/outflow'

const bubbleShellClass =
  'rounded-2xl border border-violet-300 bg-white p-3 shadow-sm dark:border-violet-600 dark:bg-zinc-900'

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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fieldName =
    variant === 'document'
      ? plainTextFieldNames.blockDocument
      : plainTextFieldNames.blockBubble

  useLayoutEffect(() => {
    if (variant === 'document') return
    const el = inputRef.current
    if (!el) return
    const maxPx = Math.min(window.innerHeight * 0.6, 384)
    el.style.height = '0px'
    const scrollH = el.scrollHeight
    const nextH = Math.min(scrollH, maxPx)
    el.style.height = `${nextH}px`
    el.style.overflowY = scrollH > maxPx ? 'auto' : 'hidden'
  }, [draft, variant])

  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [variant])

  const docTextareaClass =
    'max-h-none w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-base leading-relaxed text-zinc-800 shadow-none outline-none ring-0 selection:bg-violet-200/80 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:selection:bg-violet-900/50'

  if (variant === 'document') {
    return (
      <TextareaAutosize
        ref={inputRef}
        {...plainTextFieldProps}
        name={fieldName}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onSave(block.id, draft)
          }
        }}
        onBlur={() => onSave(block.id, draft)}
        minRows={1}
        className={docTextareaClass}
        aria-label="编辑内容块"
      />
    )
  }

  return (
    <div className={bubbleShellClass}>
      <textarea
        ref={inputRef}
        {...plainTextFieldProps}
        name={fieldName}
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
        className="w-full resize-none overflow-hidden bg-transparent text-base leading-relaxed text-zinc-900 outline-none dark:text-zinc-100"
        aria-label="编辑内容块"
      />
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Cmd/Ctrl + Enter 保存并退出编辑
      </p>
    </div>
  )
}
