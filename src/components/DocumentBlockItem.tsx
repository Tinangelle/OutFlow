import { Copy } from 'lucide-react'
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
}: {
  block: Block
  editing: boolean
  onStartEdit: (id: string) => void
  onSave: (id: string, content: string) => void
  onCopyBlock: (id: string, content: string) => void
  copyDone: boolean
}) {
  if (editing) {
    return (
      <BlockEditForm
        key={block.id}
        block={block}
        onSave={onSave}
        variant="document"
      />
    )
  }

  return (
    <div className="group relative select-none">
      <button
        type="button"
        className="absolute right-0 top-0 z-10 select-none rounded-md p-1.5 text-zinc-400 opacity-100 transition hover:bg-zinc-100 hover:text-zinc-700 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        title={copyDone ? '已复制' : '复制当前块'}
        aria-label="复制当前块"
        onClick={(e) => {
          e.stopPropagation()
          onCopyBlock(block.id, block.content)
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onStartEdit(block.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onStartEdit(block.id)
          }
        }}
        className="touch-callout-default cursor-pointer select-text rounded-lg pr-8 text-left outline-none transition hover:bg-zinc-100/80 focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-zinc-900/50"
      >
        {block.content.trim() ? (
          <MarkdownContent className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5">
            {block.content}
          </MarkdownContent>
        ) : (
          <p className="py-2 text-sm text-zinc-400 italic dark:text-zinc-500">
            空白块，点击编辑
          </p>
        )}
      </div>
    </div>
  )
}
