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
  if (editing) {
    return <BlockEditForm key={block.id} block={block} onSave={onSave} />
  }

  return (
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
      className="cursor-pointer rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm outline-none transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
    >
      <MarkdownContent className="prose prose-sm max-w-none text-left dark:prose-invert prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
        {block.content}
      </MarkdownContent>
    </div>
  )
}
