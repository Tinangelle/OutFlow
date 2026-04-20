import { useDraggable, useDroppable } from '@dnd-kit/core'
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { useLongPress } from '../hooks/useLongPress'
import { useMediaNarrowMd } from '../hooks/useMediaNarrow'
import { useOutflow } from '../hooks/useOutflow'
import {
  dragTypeChat,
  dragTypeProject,
  dropTypeProject,
  dropTypeStandaloneRoot,
  dropTypeTrash,
  sidebarChatDndId,
  sidebarProjectDndId,
} from '../lib/dnd-ids'
import {
  sortedChatsInProject,
  sortedProjectsList,
  sortedStandaloneChats,
} from '../lib/storage'
import {
  plainTextFieldNames,
  plainTextFieldProps,
} from '../lib/plain-text-field-props'
import type { Chat, Project } from '../types/outflow'
import { SettingsModal } from './SettingsModal'
import { WhaleFolderIcon } from './WhaleFolderIcon'

type TouchSheetState =
  | { kind: 'chat'; chat: Chat }
  | { kind: 'project'; project: Project }

function SidebarRenameField({
  inputRef,
  value,
  onChange,
  onBlur,
  onKeyDown,
  className,
  ariaLabel,
  name,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onChange: (next: string) => void
  onBlur: () => void
  onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void
  className: string
  ariaLabel: string
  name: string
}) {
  return (
    <form
      autoComplete="off"
      className="contents"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        {...plainTextFieldProps}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className={`${className} select-text`}
        aria-label={ariaLabel}
      />
    </form>
  )
}

function SidebarChatSelectButton({
  chat,
  active,
  narrow,
  onSelect,
  onTouchLongPress,
}: {
  chat: Chat
  active: boolean
  narrow: boolean
  onSelect: () => void
  onTouchLongPress: (c: Chat) => void
}) {
  const lp = useLongPress({
    enabled: narrow,
    onLongPress: () => onTouchLongPress(chat),
  })
  return (
    <button
      type="button"
      onPointerDown={lp.onPointerDown}
      onPointerUp={lp.onPointerUp}
      onPointerCancel={lp.onPointerCancel}
      onPointerLeave={lp.onPointerLeave}
      onClick={() => {
        if (lp.consumeClick()) return
        onSelect()
      }}
      className={`min-w-0 flex-1 touch-manipulation select-none rounded-lg px-3 py-2 text-left text-sm transition ${
        active
          ? 'font-medium text-violet-900 dark:text-violet-100'
          : 'text-zinc-700 dark:text-zinc-300'
      }`}
    >
      <span className="line-clamp-2">{chat.title}</span>
    </button>
  )
}

function SidebarProjectTitleLongPress({
  project,
  active,
  narrow,
  onSelect,
  onTouchLongPress,
}: {
  project: Project
  active: boolean
  narrow: boolean
  onSelect: () => void
  onTouchLongPress: (p: Project) => void
}) {
  const lp = useLongPress({
    enabled: narrow,
    onLongPress: () => onTouchLongPress(project),
  })
  return (
    <button
      type="button"
      className={`min-w-0 flex-1 touch-manipulation select-none rounded-lg px-1 py-2 text-left text-sm font-medium transition ${
        active
          ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100'
          : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800'
      }`}
      onPointerDown={lp.onPointerDown}
      onPointerUp={lp.onPointerUp}
      onPointerCancel={lp.onPointerCancel}
      onPointerLeave={lp.onPointerLeave}
      onClick={onSelect}
    >
      <span className="line-clamp-2">{project.title}</span>
    </button>
  )
}

function SidebarSearchPanel({
  globalSearchQuery,
  setGlobalSearchQuery,
  aggregateTags,
  activeTagFilter,
  openTagFilterView,
  onNavigate,
}: {
  globalSearchQuery: string
  setGlobalSearchQuery: (q: string) => void
  aggregateTags: string[]
  activeTagFilter: string | null
  openTagFilterView: (tag: string) => void
  onNavigate?: () => void
}) {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-2 dark:border-zinc-700 dark:bg-zinc-800/40">
      <form
        autoComplete="off"
        className="contents"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="text"
          role="search"
          {...plainTextFieldProps}
          name={plainTextFieldNames.search}
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          placeholder="搜索所有气泡正文…"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-violet-500/0 transition focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          aria-label="全局搜索"
        />
      </form>
      <div>
        <p className="mb-1.5 px-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          标签云
        </p>
        {aggregateTags.length === 0 ? (
          <p className="px-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            在正文中使用【标签】或 #标签 后，将出现在此处。
          </p>
        ) : (
          <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-0.5">
            {aggregateTags.map((tag) => {
              const active = activeTagFilter === tag
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    openTagFilterView(tag)
                    onNavigate?.()
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? 'bg-violet-600 text-white shadow-sm dark:bg-violet-500'
                      : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-violet-50 hover:ring-violet-300 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-600 dark:hover:bg-violet-950/40 dark:hover:ring-violet-500'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const DraggableSidebarChatRow = function DraggableSidebarChatRow({
  chat,
  active,
  dragTitle,
  disabled = false,
  children,
}: {
  chat: Chat
  active: boolean
  dragTitle: string
  disabled?: boolean
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: sidebarChatDndId(chat.id),
    data: { type: dragTypeChat, chatId: chat.id },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group flex select-none items-stretch gap-0.5 rounded-lg transition ${
        isDragging ? 'z-20 opacity-40' : ''
      } ${
        active
          ? 'bg-violet-100 dark:bg-violet-950/60'
          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      <div
        className="min-w-0 flex-1 cursor-grab active:cursor-grabbing"
        title={dragTitle}
        aria-label="拖拽移动对话"
      >
        {children}
      </div>
    </div>
  )
}

function DraggableProjectRow({
  project,
  dragTitle,
  disabled = false,
  children,
}: {
  project: Project
  dragTitle: string
  disabled?: boolean
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: sidebarProjectDndId(project.id),
    data: { type: dragTypeProject, projectId: project.id },
    disabled,
  })
  const { setNodeRef: setDropRef } = useDroppable({
    id: sidebarProjectDndId(project.id),
    data: { type: dragTypeProject, projectId: project.id },
  })

  const bindNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      setDropRef(node)
    },
    [setDropRef, setNodeRef],
  )

  return (
    <div
      ref={bindNodeRef}
      {...listeners}
      {...attributes}
      className={`flex select-none items-stretch gap-0.5 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div
        className="min-w-0 flex-1 cursor-grab active:cursor-grabbing"
        title={dragTitle}
        aria-label="拖拽移动项目"
      >
        {children}
      </div>
    </div>
  )
}

function ProjectDropShell({
  projectId,
  children,
}: {
  projectId: string
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `project-drop-${projectId}`,
    data: { type: dropTypeProject, projectId },
  })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg ${isOver ? 'ring-2 ring-violet-500/70 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' : ''}`}
    >
      {children}
    </div>
  )
}

function StandaloneRootDropZone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'standalone-root-drop',
    data: { type: dropTypeStandaloneRoot },
  })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg ${isOver ? 'ring-2 ring-violet-500/70 ring-offset-2 ring-offset-white ring-dashed dark:ring-offset-zinc-900' : ''}`}
    >
      {children}
    </div>
  )
}

function TrashDropZone({
  active,
  onOpen,
}: {
  active: boolean
  onOpen: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'sidebar-trash',
    data: { type: dropTypeTrash },
  })

  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 border-t border-zinc-200 p-2 dark:border-zinc-800 ${
        isOver
          ? 'bg-red-50 ring-2 ring-inset ring-red-400/60 dark:bg-red-950/30 dark:ring-red-500/50'
          : ''
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full select-none items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-xs font-semibold transition ${
          active
            ? 'border-violet-500 bg-violet-50 text-violet-900 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-100'
            : 'border-zinc-300 text-zinc-600 hover:border-red-400 hover:bg-red-50/80 hover:text-red-800 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:bg-red-950/20 dark:hover:text-red-200'
        }`}
      >
        <Trash2 className="h-4 w-4 shrink-0" />
        回收站
      </button>
    </div>
  )
}

export type SidebarProps = {
  /** 移动端抽屉是否展开（桌面端由 CSS 忽略位移） */
  isOpen?: boolean
  /** 在移动端完成导航后收起抽屉（选择对话、回收站、标签视图等） */
  onNavigate?: () => void
}

export function Sidebar({ isOpen = false, onNavigate }: SidebarProps) {
  const {
    projects,
    chats,
    activeChatId,
    activeProjectId,
    selectChat,
    selectProject,
    newChat,
    newProject,
    renameProject,
    deleteProject,
    renameChat,
    deleteChat,
    openTrashWorkspace,
    trashWorkspace,
    globalSearchQuery,
    setGlobalSearchQuery,
    activeTagFilter,
    openTagFilterView,
    aggregateTags,
  } = useOutflow()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const isExpanded = (id: string) => expanded[id] !== false

  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const committingRenameRef = useRef(false)

  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Project | null>(
    null,
  )
  const [deleteChatTarget, setDeleteChatTarget] = useState<Chat | null>(null)
  const [touchSheet, setTouchSheet] = useState<TouchSheetState | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const narrow = useMediaNarrowMd()

  useEffect(() => {
    if (!touchSheet) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setTouchSheet(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [touchSheet])

  useEffect(() => {
    if (!renamingChatId && !renamingFolderId) return
    const el = renameInputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [renamingChatId, renamingFolderId])

  const clearRenameState = useCallback(() => {
    setRenamingChatId(null)
    setRenamingFolderId(null)
    setRenameDraft('')
  }, [])

  const commitRename = useCallback(() => {
    if (committingRenameRef.current) return
    committingRenameRef.current = true
    const title = renameDraft
    if (renamingChatId) {
      renameChat(renamingChatId, title)
    } else if (renamingFolderId) {
      renameProject(renamingFolderId, title)
    }
    clearRenameState()
    queueMicrotask(() => {
      committingRenameRef.current = false
    })
  }, [
    clearRenameState,
    renameDraft,
    renamingChatId,
    renamingFolderId,
    renameChat,
    renameProject,
  ])

  const startRenameChat = useCallback((c: Chat) => {
    setRenamingChatId(c.id)
    setRenamingFolderId(null)
    setRenameDraft(c.title)
  }, [])

  const startRenameFolder = useCallback((p: Project) => {
    setRenamingFolderId(p.id)
    setRenamingChatId(null)
    setRenameDraft(p.title)
  }, [])

  const confirmDeleteFolder = useCallback(() => {
    if (!deleteFolderTarget) return
    deleteProject(deleteFolderTarget.id)
    setDeleteFolderTarget(null)
  }, [deleteFolderTarget, deleteProject])

  const confirmDeleteChat = useCallback(() => {
    if (!deleteChatTarget) return
    deleteChat(deleteChatTarget.id)
    setDeleteChatTarget(null)
  }, [deleteChatTarget, deleteChat])

  const renderChatButton = (
    chat: Chat,
    opts: { inDraggable?: boolean } = {},
  ) => {
    const active = activeProjectId === null && chat.id === activeChatId
    const renaming = renamingChatId === chat.id
    const inner = renaming ? (
      <SidebarRenameField
        inputRef={renameInputRef}
        name={plainTextFieldNames.renameChat}
        value={renameDraft}
        onChange={setRenameDraft}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            commitRename()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            clearRenameState()
          }
        }}
        className="w-full rounded-lg bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-2 ring-violet-500 dark:bg-zinc-900 dark:text-zinc-100"
        ariaLabel="对话标题"
      />
    ) : (
      <div
        className={`flex items-stretch gap-0.5 rounded-lg ${
          opts.inDraggable ? '' : active ? 'bg-violet-100 dark:bg-violet-950/60' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        <SidebarChatSelectButton
          chat={chat}
          active={active}
          narrow={narrow}
          onTouchLongPress={(c) => setTouchSheet({ kind: 'chat', chat: c })}
          onSelect={() => {
            selectChat(chat.id)
            onNavigate?.()
          }}
        />
        <div className="hidden shrink-0 items-center gap-0.5 pr-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 md:flex">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              startRenameChat(chat)
            }}
            className="select-none rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            title="重命名"
            aria-label="重命名对话"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteChatTarget(chat)
            }}
            className="select-none rounded-md p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            title="移入回收站"
            aria-label="移入回收站"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )

    if (opts.inDraggable) {
      return (
        <div className="group relative pr-1">
          {inner}
        </div>
      )
    }

    return <div className="group relative">{inner}</div>
  }

  const projectList = useMemo(() => sortedProjectsList(projects), [projects])
  const standaloneList = useMemo(() => sortedStandaloneChats(chats), [chats])

  const handleNewChat = useCallback(() => {
    newChat()
    onNavigate?.()
  }, [newChat, onNavigate])

  const handleOpenTrash = useCallback(() => {
    openTrashWorkspace()
    onNavigate?.()
  }, [openTrashWorkspace, onNavigate])

  return (
    <>
    <div
      className={`fixed inset-y-0 left-0 z-50 min-h-0 w-64 shrink-0 select-none transform transition-transform duration-300 ease-in-out md:relative md:inset-auto md:z-auto md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
    <aside className="flex h-full min-h-0 w-full select-none flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-14 items-center justify-between gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          <WhaleFolderIcon className="h-4 w-4 shrink-0 rounded-sm object-cover" />
          OutFlow
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex h-9 w-9 select-none items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title="新对话"
            aria-label="新对话"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSearchPanelOpen((o) => !o)}
            className={`flex h-9 w-9 select-none items-center justify-center rounded-lg transition ${
              searchPanelOpen
                ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
            title={searchPanelOpen ? '收起搜索与标签' : '搜索与标签'}
            aria-label="搜索与标签"
            aria-expanded={searchPanelOpen}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-b border-zinc-200 p-2 dark:border-zinc-800">
        {searchPanelOpen ? (
          <SidebarSearchPanel
            globalSearchQuery={globalSearchQuery}
            setGlobalSearchQuery={setGlobalSearchQuery}
            aggregateTags={aggregateTags}
            activeTagFilter={activeTagFilter}
            openTagFilterView={openTagFilterView}
            onNavigate={onNavigate}
          />
        ) : null}
        <button
          type="button"
          onClick={newProject}
          className="flex w-full select-none items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 bg-transparent py-2.5 text-xs font-medium text-zinc-600 transition hover:border-violet-400 hover:bg-violet-50/60 hover:text-violet-800 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-violet-500 dark:hover:bg-violet-950/30 dark:hover:text-violet-200"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          新建项目
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            项目
          </p>
          {projectList.length === 0 ? (
            <p className="px-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">
              暂无项目。点击「新建项目」创建，或将下方独立对话拖入此处（需先创建项目）。
            </p>
          ) : (
            <ul className="space-y-1">
              {projectList.map((proj) => {
                const expandedProj = isExpanded(proj.id)
                const nested = sortedChatsInProject(chats, proj.id)
                const handleSelectProjectRow = () => {
                  setExpanded((e) => ({ ...e, [proj.id]: true }))
                  selectProject(proj.id)
                  onNavigate?.()
                }
                return (
                  <li key={proj.id}>
                    <ProjectDropShell projectId={proj.id}>
                      <div
                        className={`rounded-lg border border-transparent ${
                          activeProjectId === proj.id
                            ? 'bg-violet-100 dark:bg-violet-950/60'
                            : expandedProj
                              ? 'bg-zinc-50 dark:bg-zinc-800/40'
                              : ''
                        }`}
                      >
                        <DraggableProjectRow
                          project={proj}
                          dragTitle="拖入底部回收站删除，或拖入独立区移出项目"
                          disabled={renamingFolderId === proj.id}
                        >
                          <div
                            className="flex min-w-0 flex-1 items-stretch gap-0.5"
                            onClick={handleSelectProjectRow}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpanded((st) => {
                                  const open = st[proj.id] !== false
                                  return { ...st, [proj.id]: open ? false : true }
                                })
                              }}
                              className="flex shrink-0 select-none items-center rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              aria-expanded={expandedProj}
                              title={expandedProj ? '收起' : '展开'}
                            >
                              {expandedProj ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            {renamingFolderId === proj.id ? (
                              <SidebarRenameField
                                inputRef={renameInputRef}
                                name={plainTextFieldNames.renameProject}
                                value={renameDraft}
                                onChange={setRenameDraft}
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    commitRename()
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    clearRenameState()
                                  }
                                }}
                                className="min-w-0 flex-1 rounded-lg bg-white px-2 py-2 text-base text-zinc-900 outline-none ring-2 ring-violet-500 dark:bg-zinc-900 dark:text-zinc-100"
                                ariaLabel="项目名称"
                              />
                            ) : (
                              <div className="group flex min-w-0 flex-1 items-center gap-0.5">
                                <SidebarProjectTitleLongPress
                                  project={proj}
                                  active={activeProjectId === proj.id}
                                  narrow={narrow}
                                  onSelect={handleSelectProjectRow}
                                  onTouchLongPress={(p) =>
                                    setTouchSheet({ kind: 'project', project: p })
                                  }
                                />
                                <div className="hidden shrink-0 items-center gap-0.5 pr-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 md:flex">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startRenameFolder(proj)
                                    }}
                                    className="select-none rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                                    title="重命名项目"
                                    aria-label="重命名项目"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeleteFolderTarget(proj)
                                    }}
                                    className="select-none rounded-md p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                                    title="移入回收站"
                                    aria-label="移入回收站"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </DraggableProjectRow>
                        {expandedProj && nested.length > 0 ? (
                          <ul className="space-y-0.5 border-t border-zinc-100 py-1 pl-2 dark:border-zinc-700/80">
                            {nested.map((c) => (
                              <li key={c.id}>
                                <DraggableSidebarChatRow
                                  chat={c}
                                  active={c.id === activeChatId}
                                  dragTitle="拖回下方独立区或拖入其他文件夹"
                                  disabled={renamingChatId === c.id}
                                >
                                  {renderChatButton(c, { inDraggable: true })}
                                </DraggableSidebarChatRow>
                              </li>
                            ))}
                          </ul>
                        ) : expandedProj ? (
                          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700/80 dark:text-zinc-400">
                            空项目，可将独立对话拖入此处
                          </p>
                        ) : null}
                      </div>
                    </ProjectDropShell>
                  </li>
                )
              })}
            </ul>
          )}

          <StandaloneRootDropZone>
            <p className="px-2 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              独立对话
            </p>
            <ul className="space-y-1 pb-1">
              {standaloneList.map((c) => (
                <li key={c.id}>
                  <DraggableSidebarChatRow
                    chat={c}
                    active={c.id === activeChatId}
                    dragTitle="拖入上方文件夹以归档"
                    disabled={renamingChatId === c.id}
                  >
                    {renderChatButton(c, { inDraggable: true })}
                  </DraggableSidebarChatRow>
                </li>
              ))}
            </ul>
          </StandaloneRootDropZone>
      </nav>

      <TrashDropZone active={trashWorkspace} onOpen={handleOpenTrash} />

      <div className="shrink-0 p-2">
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(true)
            onNavigate?.()
          }}
          className="flex w-full select-none items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 py-2.5 text-xs font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-200 dark:hover:border-violet-500 dark:hover:bg-violet-950/40 dark:hover:text-violet-200"
          title="设置"
          aria-label="打开设置"
        >
          <Settings className="h-4 w-4 shrink-0" />
          设置
        </button>
      </div>

    </aside>
    </div>

      {touchSheet ? (
        <div
          className="fixed inset-0 z-[70] flex select-none flex-col justify-end md:hidden"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="关闭菜单"
            onClick={() => setTouchSheet(null)}
          />
          <div className="relative z-10 rounded-t-2xl border-t border-zinc-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
            <p className="mb-4 truncate text-center text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {touchSheet.kind === 'chat'
                ? touchSheet.chat.title
                : touchSheet.project.title}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  if (touchSheet.kind === 'chat') {
                    startRenameChat(touchSheet.chat)
                  } else {
                    startRenameFolder(touchSheet.project)
                  }
                  setTouchSheet(null)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <Pencil className="h-4 w-4 shrink-0" />
                重命名
              </button>
              <button
                type="button"
                onClick={() => {
                  if (touchSheet.kind === 'chat') {
                    setDeleteChatTarget(touchSheet.chat)
                  } else {
                    setDeleteFolderTarget(touchSheet.project)
                  }
                  setTouchSheet(null)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-800 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                移入回收站
              </button>
              <button
                type="button"
                onClick={() => setTouchSheet(null)}
                className="rounded-xl py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      ) : null}

      {deleteFolderTarget && (
        <div
          className="fixed inset-0 z-[60] flex select-none items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteFolderTarget(null)
          }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setDeleteFolderTarget(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-folder-title"
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-folder-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              将项目移入回收站？
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              「{deleteFolderTarget.title}」将移入回收站；其中的对话在侧栏中隐藏，可在回收站恢复或彻底删除。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteFolderTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteFolder}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                移入回收站
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteChatTarget && (
        <div
          className="fixed inset-0 z-[60] flex select-none items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteChatTarget(null)
          }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setDeleteChatTarget(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-chat-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              将对话移入回收站？
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              「{deleteChatTarget.title}」及其内容块将移入回收站，可在回收站恢复或彻底删除。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteChatTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteChat}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                移入回收站
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
