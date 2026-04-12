import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  GripVertical,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useOutflow } from '../hooks/useOutflow'
import {
  sortedChatsInProject,
  sortedProjectsList,
  sortedStandaloneChats,
} from '../lib/storage'
import type { Chat, Project } from '../types/outflow'

const dragTypeChat = 'sidebar-chat'
const dropTypeProject = 'sidebar-project'
const dropTypeStandaloneRoot = 'sidebar-standalone-root'

function DraggableSidebarChatRow({
  chat,
  active,
  dragTitle,
  children,
}: {
  chat: Chat
  active: boolean
  dragTitle: string
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `sidebar-chat-${chat.id}`,
      data: { type: dragTypeChat, chatId: chat.id },
    })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-stretch gap-0.5 rounded-lg transition ${
        isDragging ? 'z-20 opacity-60' : ''
      } ${
        active
          ? 'bg-violet-100 dark:bg-violet-950/60'
          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      <button
        type="button"
        className="flex shrink-0 cursor-grab touch-none items-center rounded-l-lg px-1 text-zinc-400 hover:text-zinc-600 active:cursor-grabbing dark:hover:text-zinc-300"
        title={dragTitle}
        aria-label="拖拽移动对话"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
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

export function Sidebar() {
  const {
    projects,
    chats,
    activeChatId,
    selectChat,
    newChat,
    newProject,
    renameProject,
    deleteProject,
    renameChat,
    deleteChat,
    moveChatToProject,
  } = useOutflow()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const isExpanded = (id: string) => expanded[id] !== false

  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Project | null>(
    null,
  )
  const [deleteChatTarget, setDeleteChatTarget] = useState<Chat | null>(null)

  useEffect(() => {
    if (!renamingChatId && !renamingFolderId) return
    const el = renameInputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [renamingChatId, renamingFolderId])

  const commitRename = useCallback(() => {
    const title = renameDraft
    if (renamingChatId) {
      renameChat(renamingChatId, title)
      setRenamingChatId(null)
    } else if (renamingFolderId) {
      renameProject(renamingFolderId, title)
      setRenamingFolderId(null)
    }
  }, [renameDraft, renamingChatId, renamingFolderId, renameChat, renameProject])

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return
      const drag = active.data.current
      const drop = over.data.current
      if (drag?.type !== dragTypeChat || typeof drag.chatId !== 'string') return
      if (drop?.type === dropTypeProject && typeof drop.projectId === 'string') {
        moveChatToProject(drag.chatId, drop.projectId)
        return
      }
      if (drop?.type === dropTypeStandaloneRoot) {
        moveChatToProject(drag.chatId, null)
      }
    },
    [moveChatToProject],
  )

  const renderChatButton = (
    chat: Chat,
    opts: { inDraggable?: boolean } = {},
  ) => {
    const active = chat.id === activeChatId
    const renaming = renamingChatId === chat.id
    const inner = renaming ? (
      <input
        ref={renameInputRef}
        value={renameDraft}
        onChange={(e) => setRenameDraft(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitRename()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setRenamingChatId(null)
          }
        }}
        className="w-full rounded-lg bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-2 ring-violet-500 dark:bg-zinc-900 dark:text-zinc-100"
        aria-label="对话标题"
      />
    ) : (
      <div
        className={`flex items-stretch gap-0.5 rounded-lg ${
          opts.inDraggable ? '' : active ? 'bg-violet-100 dark:bg-violet-950/60' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        <button
          type="button"
          onClick={() => selectChat(chat.id)}
          className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm transition ${
            active
              ? 'font-medium text-violet-900 dark:text-violet-100'
              : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <span className="line-clamp-2">{chat.title}</span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              startRenameChat(chat)
            }}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
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
            className="rounded-md p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            title="删除"
            aria-label="删除对话"
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

  const projectList = sortedProjectsList(projects)
  const standaloneList = sortedStandaloneChats(chats)

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-14 items-center border-b border-zinc-200 px-3 dark:border-zinc-800">
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          <FolderOpen className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          OutFlow
        </span>
      </div>

      <div className="shrink-0 space-y-2 border-b border-zinc-200 p-2 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={newChat}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 py-2 text-xs font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:border-violet-500 dark:hover:bg-violet-950/40 dark:hover:text-violet-200"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            新对话
          </button>
          <button
            type="button"
            disabled
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
            title="搜索（即将推出）"
            aria-label="搜索"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={newProject}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 bg-transparent py-2.5 text-xs font-medium text-zinc-600 transition hover:border-violet-400 hover:bg-violet-50/60 hover:text-violet-800 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-violet-500 dark:hover:bg-violet-950/30 dark:hover:text-violet-200"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          新建文件夹
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            项目
          </p>
          {projectList.length === 0 ? (
            <p className="px-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">
              暂无文件夹。点击「新建文件夹」创建，或将下方独立对话拖入此处（需先创建文件夹）。
            </p>
          ) : (
            <ul className="space-y-1">
              {projectList.map((proj) => {
                const expandedProj = isExpanded(proj.id)
                const nested = sortedChatsInProject(chats, proj.id)
                return (
                  <li key={proj.id}>
                    <ProjectDropShell projectId={proj.id}>
                      <div
                        className={`rounded-lg border border-transparent ${
                          expandedProj ? 'bg-zinc-50 dark:bg-zinc-800/40' : ''
                        }`}
                      >
                        <div className="flex items-stretch gap-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((e) => {
                                const open = e[proj.id] !== false
                                return { ...e, [proj.id]: open ? false : true }
                              })
                            }
                            className="flex shrink-0 items-center rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                            <input
                              ref={renameInputRef}
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  commitRename()
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault()
                                  setRenamingFolderId(null)
                                }
                              }}
                              className="min-w-0 flex-1 rounded-lg bg-white px-2 py-2 text-sm text-zinc-900 outline-none ring-2 ring-violet-500 dark:bg-zinc-900 dark:text-zinc-100"
                              aria-label="文件夹名称"
                            />
                          ) : (
                            <div className="group flex min-w-0 flex-1 items-center gap-0.5">
                              <span className="line-clamp-2 flex-1 px-1 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                {proj.title}
                              </span>
                              <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => startRenameFolder(proj)}
                                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                                  title="重命名文件夹"
                                  aria-label="重命名文件夹"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteFolderTarget(proj)}
                                  className="rounded-md p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                                  title="删除文件夹"
                                  aria-label="删除文件夹"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {expandedProj && nested.length > 0 ? (
                          <ul className="space-y-0.5 border-t border-zinc-100 py-1 pl-2 dark:border-zinc-700/80">
                            {nested.map((c) => (
                              <li key={c.id}>
                                <DraggableSidebarChatRow
                                  chat={c}
                                  active={c.id === activeChatId}
                                  dragTitle="拖回下方独立区或拖入其他文件夹"
                                >
                                  {renderChatButton(c, { inDraggable: true })}
                                </DraggableSidebarChatRow>
                              </li>
                            ))}
                          </ul>
                        ) : expandedProj ? (
                          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700/80 dark:text-zinc-400">
                            空文件夹，可将独立对话拖入此处
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
                  >
                    {renderChatButton(c, { inDraggable: true })}
                  </DraggableSidebarChatRow>
                </li>
              ))}
            </ul>
          </StandaloneRootDropZone>
        </nav>
      </DndContext>

      {deleteFolderTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
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
              删除文件夹？
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              「{deleteFolderTarget.title}」将被删除，其中的对话会移回「独立对话」区，内容保留。
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
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteChatTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
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
              删除对话？
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              将永久删除「{deleteChatTarget.title}」及其全部内容块，且无法恢复。
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
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
