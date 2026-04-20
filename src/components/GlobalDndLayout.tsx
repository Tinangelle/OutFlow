import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { GripVertical, MessageSquare } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { useOutflow } from '../hooks/useOutflow'
import {
  dragTypeBlock,
  dragTypeBoardChat,
  dragTypeChat,
  dragTypeProject,
  dropTypeProject,
  dropTypeStandaloneRoot,
  dropTypeTrash,
} from '../lib/dnd-ids'
import { blockPreview } from '../lib/block-preview'
import { WhaleFolderIcon } from './WhaleFolderIcon'

type OverlayState =
  | { kind: 'chat'; chatId: string }
  | { kind: 'project'; projectId: string }
  | { kind: 'block'; blockId: string; preview: string }
  | null

function OverlayCard({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none max-w-[240px] select-none rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
      {children}
    </div>
  )
}

function OverlayTitle({
  title,
  isOverlay,
}: {
  title: string
  isOverlay: boolean
}) {
  return (
    <span className={isOverlay ? 'line-clamp-2' : ''}>
      {title}
    </span>
  )
}

function DragOverlayContent({ state }: { state: OverlayState }) {
  const { chats, projects, activeChatBlocks } = useOutflow()
  if (!state) return null
  if (state.kind === 'chat') {
    const c = chats.find((x) => x.id === state.chatId)
    return (
      <OverlayCard>
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
          <MessageSquare className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <OverlayTitle title={c?.title ?? '对话'} isOverlay />
        </div>
      </OverlayCard>
    )
  }
  if (state.kind === 'project') {
    const p = projects.find((x) => x.id === state.projectId)
    return (
      <OverlayCard>
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
          <WhaleFolderIcon className="h-4 w-4 shrink-0 rounded-sm object-cover" />
          <OverlayTitle title={p?.title ?? '项目'} isOverlay />
        </div>
      </OverlayCard>
    )
  }
  const b = activeChatBlocks.find((x) => x.id === state.blockId)
  return (
    <OverlayCard>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
          卡片
        </span>
        <GripVertical className="h-3.5 w-3.5 text-zinc-400" />
      </div>
      <p className="whitespace-pre-wrap text-left text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
        {blockPreview(b?.content ?? state.preview)}
      </p>
    </OverlayCard>
  )
}

export function GlobalDndLayout({ children }: { children: ReactNode }) {
  const {
    moveChatToProject,
    deleteChat,
    deleteProject,
    softDeleteBlock,
    reorderBlocks,
    reorderProjects,
    reorderChatsInProject,
    activeChatBlocks,
    projects,
    chats,
    activeProjectId,
  } = useOutflow()

  const [overlay, setOverlay] = useState<OverlayState>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const onDragStart = useCallback((event: DragStartEvent) => {
    const d = event.active.data.current as Record<string, unknown> | undefined
    if (!d?.type) {
      setOverlay(null)
      return
    }
    if (
      (d.type === dragTypeChat || d.type === dragTypeBoardChat) &&
      typeof d.chatId === 'string'
    ) {
      setOverlay({ kind: 'chat', chatId: d.chatId })
      return
    }
    if (d.type === dragTypeProject && typeof d.projectId === 'string') {
      setOverlay({ kind: 'project', projectId: d.projectId })
      return
    }
    if (d.type === dragTypeBlock && typeof d.blockId === 'string') {
      const blockId = d.blockId
      const preview =
        typeof d.contentPreview === 'string' ? d.contentPreview : ''
      setOverlay({ kind: 'block', blockId, preview })
      return
    }
    setOverlay(null)
  }, [])

  const clearOverlay = useCallback(() => setOverlay(null), [])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      clearOverlay()
      if (!over) return

      const drag = active.data.current as Record<string, unknown> | undefined
      const drop = over.data.current as Record<string, unknown> | undefined

      if (drop?.type === dropTypeTrash) {
        if (drag?.type === dragTypeChat && typeof drag.chatId === 'string') {
          deleteChat(drag.chatId)
          return
        }
        if (
          drag?.type === dragTypeProject &&
          typeof drag.projectId === 'string'
        ) {
          deleteProject(drag.projectId)
          return
        }
        if (drag?.type === dragTypeBlock && typeof drag.blockId === 'string') {
          softDeleteBlock(drag.blockId)
          return
        }
        return
      }

      if (drag?.type === dragTypeChat && typeof drag.chatId === 'string') {
        if (drop?.type === dropTypeProject && typeof drop.projectId === 'string') {
          moveChatToProject(drag.chatId, drop.projectId)
          return
        }
        if (drop?.type === dropTypeStandaloneRoot) {
          moveChatToProject(drag.chatId, null)
        }
        return
      }

      if (drag?.type === dragTypeBoardChat && typeof drag.chatId === 'string') {
        if (!activeProjectId) return
        const activeId = drag.chatId
        const overId = String(over.id)
        if (activeId === overId) return
        // 优先使用拖拽源提供的当前排序快照
        const projectChats = (event.active.data.current?.projectChatIds ??
          null) as string[] | null
        const baseIds =
          projectChats && projectChats.length > 0
            ? projectChats
            : chats
                .filter((c) => c.projectId === activeProjectId)
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                .map((c) => c.id)
        if (!baseIds.includes(activeId) || !baseIds.includes(overId)) return
        const oldIndex = baseIds.indexOf(activeId)
        const newIndex = baseIds.indexOf(overId)
        if (oldIndex < 0 || newIndex < 0) return
        reorderChatsInProject(activeProjectId, arrayMove(baseIds, oldIndex, newIndex))
        return
      }

      if (drag?.type === dragTypeBlock && typeof drag.blockId === 'string') {
        const activeId = drag.blockId
        const overId = String(over.id)
        const ids = activeChatBlocks.map((b) => b.id)
        if (!ids.includes(activeId) || !ids.includes(overId)) return
        if (activeId === overId) return
        const oldIndex = ids.indexOf(activeId)
        const newIndex = ids.indexOf(overId)
        if (oldIndex < 0 || newIndex < 0) return
        reorderBlocks(arrayMove(ids, oldIndex, newIndex))
        return
      }

      if (drag?.type === dragTypeProject && typeof drag.projectId === 'string') {
        const activeId = drag.projectId
        const overProjectId =
          drop?.type === dragTypeProject && typeof drop.projectId === 'string'
            ? drop.projectId
            : null
        if (!overProjectId || activeId === overProjectId) return
        const ids = projects.map((p) => p.id)
        if (!ids.includes(activeId) || !ids.includes(overProjectId)) return
        const oldIndex = ids.indexOf(activeId)
        const newIndex = ids.indexOf(overProjectId)
        if (oldIndex < 0 || newIndex < 0) return
        reorderProjects(arrayMove(ids, oldIndex, newIndex))
      }
    },
    [
      activeChatBlocks,
      clearOverlay,
      deleteChat,
      deleteProject,
      moveChatToProject,
      reorderChatsInProject,
      reorderBlocks,
      reorderProjects,
      softDeleteBlock,
      projects,
      chats,
      activeProjectId,
    ],
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={clearOverlay}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
      <DragOverlay dropAnimation={null}>
        <DragOverlayContent state={overlay} />
      </DragOverlay>
    </DndContext>
  )
}
