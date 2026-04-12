import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useMemo } from 'react'
import type { Block } from '../types/outflow'

function blockPreview(content: string, maxLines = 4): string {
  const normalized = content.replace(/\r\n/g, '\n').trim()
  if (!normalized) return '（空）'
  const lines = normalized.split('\n')
  const slice = lines.slice(0, maxLines)
  const text = slice.join('\n')
  return lines.length > maxLines ? `${text}…` : text
}

function SortableCard({
  block,
}: {
  block: Block
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${
        isDragging ? 'z-10 opacity-60 ring-2 ring-violet-500/40' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-zinc-400 dark:text-zinc-500">
          #{block.orderIndex + 1}
        </span>
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          title="拖拽排序"
          aria-label="拖拽排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <p className="whitespace-pre-wrap text-left text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {blockPreview(block.content)}
      </p>
    </div>
  )
}

interface BoardViewProps {
  blocks: Block[]
  reorderBlocks: (orderedIds: string[]) => void
}

export function BoardView({ blocks, reorderBlocks }: BoardViewProps) {
  const ids = useMemo(() => blocks.map((b) => b.id), [blocks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    reorderBlocks(arrayMove(ids, oldIndex, newIndex))
  }

  if (blocks.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        暂无卡片，切换到聊天视图添加内容。
      </p>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="mx-auto grid max-w-5xl grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {blocks.map((b) => (
            <SortableCard key={b.id} block={b} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
