import { useLayoutEffect, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { getIsIOSLike } from '../lib/ios'
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
  onFocus,
  readProseClassName,
}: {
  block: Block
  onSave: (id: string, content: string) => void
  variant?: 'bubble' | 'document'
  onFocus?: () => void
  /** 与 DocumentBlockItem 只读区一致，避免切到编辑时字号/行高突变 */
  readProseClassName?: string
}) {
  const [draft, setDraft] = useState(() => block.content)
  const [isIOSLike] = useState(getIsIOSLike)
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
    el.focus({ preventScroll: true })
    const len = el.value.length
    // Defer: ensures caret/scroll position in textarea applies after focus without page scroll
    const id = requestAnimationFrame(() => {
      el.setSelectionRange(len, len)
    })
    return () => cancelAnimationFrame(id)
  }, [variant])

  // 与 @tailwindcss/typography 的 prose / prose-sm 正文行高一致，避免从 Markdown 只读切到纯文本时「字突然变大/行变疏」
  const docTextareaClass = [
    'not-prose max-h-none w-full min-h-0 resize-none overflow-hidden border-0 bg-transparent p-0 text-left text-zinc-800 shadow-none outline-none ring-0 selection:bg-violet-200/80 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:selection:bg-violet-900/50',
    isIOSLike ? 'text-base leading-7' : 'text-sm leading-[1.7142857]',
  ].join(' ')

  const docLineRows = Math.max(1, draft.split('\n').length)

  if (variant === 'document') {
    const field = (
      <TextareaAutosize
        ref={inputRef}
        {...plainTextFieldProps}
        name={fieldName}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => onFocus?.()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onSave(block.id, draft)
          }
        }}
        onBlur={() => onSave(block.id, draft)}
        minRows={docLineRows}
        className={docTextareaClass}
        aria-label="编辑内容块"
      />
    )
    if (readProseClassName) {
      return (
        <div className={`${readProseClassName} [&_textarea]:mt-0`}>{field}</div>
      )
    }
    return field
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
