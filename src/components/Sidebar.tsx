import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutflow } from '../hooks/useOutflow'
import type { Project } from '../types/outflow'

export function Sidebar() {
  const {
    projects,
    activeProjectId,
    selectProject,
    newProject,
    renameProject,
    deleteProject,
  } = useOutflow()

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  useEffect(() => {
    if (!renamingId) return
    const el = renameInputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [renamingId])

  const commitRename = useCallback(() => {
    if (!renamingId) return
    renameProject(renamingId, renameDraft)
    setRenamingId(null)
  }, [renamingId, renameDraft, renameProject])

  const startRename = useCallback((p: Project) => {
    setRenamingId(p.id)
    setRenameDraft(p.title)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteProject(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, deleteProject])

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-14 items-center border-b border-zinc-200 px-3 dark:border-zinc-800">
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          <FolderOpen className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          OutFlow
        </span>
      </div>
      <div className="p-2">
        <button
          type="button"
          onClick={newProject}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-violet-500 dark:hover:bg-violet-950/40 dark:hover:text-violet-300"
        >
          <Plus className="h-4 w-4" />
          新建项目
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <ul className="space-y-1">
          {projects.map((p) => {
            const active = p.id === activeProjectId
            return (
              <li key={p.id} className="group relative">
                <div
                  className={`flex items-stretch gap-0.5 rounded-lg transition ${
                    active
                      ? 'bg-violet-100 dark:bg-violet-950/60'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {renamingId === p.id ? (
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
                          setRenamingId(null)
                        }
                      }}
                      className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-2 ring-violet-500 dark:bg-zinc-900 dark:text-zinc-100"
                      aria-label="项目名称"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectProject(p.id)}
                      className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm transition ${
                        active
                          ? 'font-medium text-violet-900 dark:text-violet-100'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="line-clamp-2">{p.title}</span>
                      <span className="mt-0.5 block text-xs font-normal text-zinc-500 dark:text-zinc-500">
                        {p.blocks.length} 条
                      </span>
                    </button>
                  )}
                  {renamingId !== p.id && (
                    <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          startRename(p)
                        }}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                        title="重命名"
                        aria-label="重命名"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(p)
                        }}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        title="删除"
                        aria-label="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </nav>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-project-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              删除项目？
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              将永久删除「{deleteTarget.title}」及其全部内容，且无法恢复。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
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
