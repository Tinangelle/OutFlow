import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRightLeft, GripVertical, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { dragTypeBlock, dragTypeBoardChat } from '../lib/dnd-ids'
import { blockPreview } from '../lib/block-preview'
import type { Block, Chat } from '../types/outflow'
import { BlockMoveMenu } from './BlockMoveMenu'

function SummaryEditor({
  value,
  onSave,
  ariaLabel,
}: {
  value?: string
  onSave: (summary: string) => void
  ariaLabel: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const commit = () => {
    onSave(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <TextareaAutosize
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        minRows={2}
        className="w-full resize-none rounded-xl border border-violet-300 bg-violet-50/80 px-2 py-1.5 text-left text-sm leading-relaxed text-zinc-800 outline-none ring-1 ring-violet-200 dark:border-violet-700 dark:bg-violet-900/30 dark:text-zinc-100 dark:ring-violet-800"
        aria-label={ariaLabel}
        autoFocus
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? '')
        setEditing(true)
      }}
      className="w-full rounded-xl bg-violet-50/70 px-2 py-1.5 text-left text-sm leading-relaxed text-zinc-700 transition hover:bg-violet-100 dark:bg-violet-900/20 dark:text-zinc-200 dark:hover:bg-violet-900/35"
      aria-label={ariaLabel}
      title="点击编辑提要，Cmd/Ctrl + Enter 保存"
    >
      {value?.trim() ? (
        value
      ) : (
        <span className="text-zinc-400 dark:text-zinc-500">+ 添加提要...</span>
      )}
    </button>
  )
}

function SortableBlockCard({
  block,
  onDeleteBlock,
  onUpdateBlockSummary,
  draggable = true,
}: {
  block: Block
  onDeleteBlock: (id: string) => void
  onUpdateBlockSummary: (id: string, summary: string) => void
  draggable?: boolean
}) {
  const [moveOpen, setMoveOpen] = useState(false)
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState(block.summary ?? '')
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

  const style = draggable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : undefined,
      }
    : undefined

  const displayContent = block.summary ? block.summary : block.content
  const showingSummary = Boolean(block.summary?.trim())

  const saveSummary = () => {
    onUpdateBlockSummary(block.id, summaryDraft)
    setEditingSummary(false)
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
              setMoveOpen((v) => !v)
            }}
            className="hidden h-8 w-8 select-none items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 md:flex md:opacity-0 md:transition md:group-hover:opacity-100"
            title="移动到其他对话"
            aria-label="移动到其他对话"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
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
          {draggable ? (
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
          ) : null}
        </div>
      </div>
      {moveOpen ? (
        <BlockMoveMenu
          blockId={block.id}
          currentChatId={block.chatId}
          onClose={() => setMoveOpen(false)}
        />
      ) : null}
      {editingSummary ? (
        <TextareaAutosize
          value={summaryDraft}
          onChange={(e) => setSummaryDraft(e.target.value)}
          onBlur={saveSummary}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              saveSummary()
            }
          }}
          minRows={2}
          className="w-full resize-none rounded-xl border border-violet-300 bg-violet-50/80 px-2 py-1.5 text-left text-sm leading-relaxed text-zinc-800 outline-none ring-1 ring-violet-200 dark:border-violet-700 dark:bg-violet-900/30 dark:text-zinc-100 dark:ring-violet-800"
          aria-label="编辑卡片提要"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setSummaryDraft(block.summary ?? '')
            setEditingSummary(true)
          }}
          className={`w-full line-clamp-4 select-text whitespace-pre-wrap rounded-xl px-2 py-1.5 text-left text-sm leading-relaxed ${
            showingSummary
              ? 'font-medium text-blue-600 dark:text-blue-400'
              : 'text-zinc-800 dark:text-zinc-200'
          }`}
          title="点击编辑提要（Cmd/Ctrl + Enter 保存）"
          aria-label="卡片展示内容"
        >
          {blockPreview(displayContent)}
        </button>
      )}
    </div>
  )
}

interface BoardViewProps {
  blocks: Block[]
  projectChats?: Chat[]
  selectedProjectId?: string | null
  onDeleteBlock: (blockId: string) => void
  onUpdateBlockSummary: (blockId: string, summary: string) => void
  onUpdateChatSummary: (chatId: string, summary: string) => void
}

export function BoardView({
  blocks,
  projectChats,
  selectedProjectId,
  onDeleteBlock,
  onUpdateBlockSummary,
  onUpdateChatSummary,
}: BoardViewProps) {
  if (selectedProjectId) {
    const chatCards = projectChats ?? []
    const chatIds = chatCards.map((c) => c.id)
    if (chatCards.length === 0) {
      return (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          当前项目下暂无对话。
        </p>
      )
    }
    return (
      <SortableContext items={chatIds} strategy={rectSortingStrategy}>
        <div className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {chatCards.map((chat, idx) => (
            <SortableChatCard
              key={chat.id}
              chat={chat}
              orderLabel={idx + 1}
              projectChatIds={chatIds}
              onUpdateChatSummary={onUpdateChatSummary}
            />
          ))}
        </div>
      </SortableContext>
    )
  }

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
          <SortableCard
            key={b.id}
            block={b}
            onDeleteBlock={onDeleteBlock}
            onUpdateBlockSummary={onUpdateBlockSummary}
          />
        ))}
      </div>
    </SortableContext>
  )
}

function SortableChatCard({
  chat,
  orderLabel,
  projectChatIds,
  onUpdateChatSummary,
}: {
  chat: Chat
  orderLabel: number
  projectChatIds: string[]
  onUpdateChatSummary: (chatId: string, summary: string) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: chat.id,
      data: {
        type: dragTypeBoardChat,
        chatId: chat.id,
        projectChatIds,
      },
    })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  }
  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`group rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${
        isDragging ? 'z-10 ring-2 ring-violet-500/40' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
            #{orderLabel}
          </span>
          <h3 className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {chat.title}
          </h3>
        </div>
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          title="拖拽排序"
          aria-label="拖拽对话卡片"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <SummaryEditor
        value={chat.summary}
        onSave={(summary) => onUpdateChatSummary(chat.id, summary)}
        ariaLabel="编辑对话提要"
      />
    </section>
  )
}

function SortableCard({
  block,
  onDeleteBlock,
  onUpdateBlockSummary,
}: {
  block: Block
  onDeleteBlock: (id: string) => void
  onUpdateBlockSummary: (id: string, summary: string) => void
}) {
  return (
    <SortableBlockCard
      block={block}
      onDeleteBlock={onDeleteBlock}
      onUpdateBlockSummary={onUpdateBlockSummary}
    />
  )
}
