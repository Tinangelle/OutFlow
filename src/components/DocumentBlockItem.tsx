import { useState } from 'react'
import { Copy } from 'lucide-react'
import { getIsIOSLike } from '../lib/ios'
import { calculateWordCount } from '../lib/utils'
import { BlockEditForm } from './BlockEditForm'
import { MarkdownContent } from './MarkdownContent'
import type { Block } from '../types/outflow'

export function DocumentBlockItem({
  block,
  editing,
  onStartEdit,
  onSave,
  onCopyBlock,
  copyDone,
  focused,
  onFocusBlock,
}: {
  block: Block
  editing: boolean
  onStartEdit: (id: string) => void
  onSave: (id: string, content: string) => void
  onCopyBlock: (id: string, content: string) => void
  copyDone: boolean
  focused: boolean
  onFocusBlock: (id: string | null) => void
}) {
  const [isIOSLike] = useState(getIsIOSLike)
  const readProseClass = [
    'prose max-w-none dark:prose-invert prose-headings:font-semibold prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5',
    isIOSLike ? '' : 'prose-sm',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="group relative select-none" data-document-block-id={block.id}>
      {editing ? (
        <BlockEditForm
          key={block.id}
          block={block}
          onSave={onSave}
          variant="document"
          readProseClassName={readProseClass}
          onFocus={() => onFocusBlock(block.id)}
        />
      ) : null}
      {!editing && focused ? (
        <span className="pointer-events-none absolute -bottom-5 right-0 z-10 text-xs text-gray-400">
          {calculateWordCount(block.content)} 词
        </span>
      ) : null}
      {!editing ? (
        <button
          type="button"
          className="absolute right-0 top-0 z-10 select-none rounded-md p-1.5 text-zinc-400 opacity-100 transition hover:bg-zinc-100 hover:text-zinc-700 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          title={copyDone ? '已复制' : '复制当前块'}
          aria-label="复制当前块"
          onClick={(e) => {
            e.stopPropagation()
            onFocusBlock(block.id)
            onCopyBlock(block.id, block.content)
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {!editing ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onStartEdit(block.id)}
          onFocus={() => onFocusBlock(block.id)}
          onBlur={() => onFocusBlock(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onFocusBlock(block.id)
              onStartEdit(block.id)
            }
          }}
          className="touch-callout-default cursor-pointer select-text rounded-lg pr-8 text-left outline-none transition hover:bg-zinc-100/80 focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-zinc-900/50"
        >
          {block.content.trim() ? (
            <MarkdownContent className={readProseClass}>
              {block.content}
            </MarkdownContent>
          ) : (
            <p
              className={
                isIOSLike
                  ? 'py-2 text-base text-zinc-400 italic dark:text-zinc-500'
                  : 'py-2 text-sm text-zinc-400 italic dark:text-zinc-500'
              }
            >
              空白块，点击编辑
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
