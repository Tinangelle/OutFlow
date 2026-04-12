import { Trash2 } from 'lucide-react'
import { useOutflow } from '../hooks/useOutflow'
import { BlockEditForm } from './BlockEditForm'
import { MarkdownContent } from './MarkdownContent'
import type { Block } from '../types/outflow'

interface BlockBubbleProps {
  block: Block
  editing: boolean
  onStartEdit: (id: string) => void
  onSave: (id: string, content: string) => void
}

export function BlockBubble({
  block,
  editing,
  onStartEdit,
  onSave,
}: BlockBubbleProps) {
  const { softDeleteBlock } = useOutflow()

  if (editing) {
    return <BlockEditForm key={block.id} block={block} onSave={onSave} />
  }

  return (
    <div className="group relative select-none">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          softDeleteBlock(block.id)
        }}
        className="absolute right-2 top-2 z-10 hidden h-8 w-8 select-none items-center justify-center rounded-lg text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 md:flex md:opacity-0 md:transition md:group-hover:opacity-100"
        title="移入回收站"
        aria-label="移入回收站"
      >
        <Trash2 className="h-4 w-4" />
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
        className="touch-callout-default cursor-pointer select-text rounded-2xl border border-zinc-200 bg-white px-4 py-3 pr-12 text-left shadow-sm outline-none transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
      >
        <MarkdownContent className="prose prose-sm max-w-none text-left dark:prose-invert prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
          {block.content}
        </MarkdownContent>
      </div>
    </div>
  )
}
