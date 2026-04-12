import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { dragTypeBlock } from '../lib/dnd-ids'
import { blockPreview } from '../lib/block-preview'
import type { Block } from '../types/outflow'

function SortableCard({
  block,
  onDeleteBlock,
}: {
  block: Block
  onDeleteBlock: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: {
      type: dragTypeBlock,
      blockId: block.id,
      contentPreview: block.content,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${
        isDragging ? 'z-10 ring-2 ring-violet-500/40' : ''
      }`}
    >
      <div className="mb-2 flex select-none items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-zinc-400 dark:text-zinc-500">
          #{block.orderIndex + 1}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteBlock(block.id)
            }}
            className="hidden h-8 w-8 select-none items-center justify-center rounded-lg text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 md:flex md:opacity-0 md:transition md:group-hover:opacity-100"
            title="移入回收站"
            aria-label="移入回收站"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="拖拽排序或拖至侧栏回收站"
            aria-label="拖拽卡片"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="select-text whitespace-pre-wrap text-left text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {blockPreview(block.content)}
      </p>
    </div>
  )
}

interface BoardViewProps {
  blocks: Block[]
  onDeleteBlock: (blockId: string) => void
}

export function BoardView({ blocks, onDeleteBlock }: BoardViewProps) {
  const ids = useMemo(() => blocks.map((b) => b.id), [blocks])

  if (blocks.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        暂无卡片，切换到聊天视图添加内容。
      </p>
    )
  }

  return (
    <SortableContext items={ids} strategy={rectSortingStrategy}>
      <div className="mx-auto grid max-w-5xl grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {blocks.map((b) => (
          <SortableCard key={b.id} block={b} onDeleteBlock={onDeleteBlock} />
        ))}
      </div>
    </SortableContext>
  )
}
