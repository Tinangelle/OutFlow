import { useOutflow } from '../hooks/useOutflow'
import { blockPreview } from '../lib/block-preview'
import type { Block, Chat, Project } from '../types/outflow'

function RowActions({
  onRestore,
  onPermanent,
}: {
  onRestore: () => void
  onPermanent: () => void
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onRestore}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        恢复
      </button>
      <button
        type="button"
        onClick={onPermanent}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
      >
        彻底删除
      </button>
    </div>
  )
}

function ProjectTrashCard({
  p,
  restoreProject,
  permanentDeleteProject,
}: {
  p: Project
  restoreProject: (id: string) => void
  permanentDeleteProject: (id: string) => void
}) {
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {p.title}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        项目 · {new Date(p.deletedAt ?? p.updatedAt).toLocaleString()}
      </p>
      <RowActions
        onRestore={() => restoreProject(p.id)}
        onPermanent={() => {
          if (
            window.confirm(
              `确定彻底删除项目「${p.title}」？此操作不可恢复；其中对话将变为独立对话（若仍在回收站则保持回收站状态）。`,
            )
          ) {
            permanentDeleteProject(p.id)
          }
        }}
      />
    </li>
  )
}

function ChatTrashCard({
  c,
  allProjects,
  restoreChat,
  permanentDeleteChat,
}: {
  c: Chat
  allProjects: Project[]
  restoreChat: (id: string) => void
  permanentDeleteChat: (id: string) => void
}) {
  const folder =
    c.projectId &&
    allProjects.find((p) => p.id === c.projectId)?.title

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {c.title}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        对话
        {folder ? ` · 所属项目：${folder}` : ''} ·{' '}
        {new Date(c.deletedAt ?? c.updatedAt).toLocaleString()}
      </p>
      <RowActions
        onRestore={() => restoreChat(c.id)}
        onPermanent={() => {
          if (
            window.confirm(
              `确定彻底删除对话「${c.title}」及其全部内容块？此操作不可恢复。`,
            )
          ) {
            permanentDeleteChat(c.id)
          }
        }}
      />
    </li>
  )
}

function BlockTrashCard({
  b,
  allChats,
  restoreBlock,
  permanentDeleteBlock,
}: {
  b: Block
  allChats: Chat[]
  restoreBlock: (id: string) => void
  permanentDeleteBlock: (id: string) => void
}) {
  const chat = allChats.find((c) => c.id === b.chatId)

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        内容块
      </p>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">
        {blockPreview(b.content, 6)}
      </p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        对话：{chat?.title ?? b.chatId} ·{' '}
        {new Date(b.deletedAt ?? b.updatedAt).toLocaleString()}
      </p>
      <RowActions
        onRestore={() => restoreBlock(b.id)}
        onPermanent={() => {
          if (window.confirm('确定彻底删除此内容块？此操作不可恢复。')) {
            permanentDeleteBlock(b.id)
          }
        }}
      />
    </li>
  )
}

export function TrashView() {
  const {
    trashProjects,
    trashChats,
    trashBlocks,
    allChats,
    allProjects,
    restoreProject,
    restoreChat,
    restoreBlock,
    permanentDeleteProject,
    permanentDeleteChat,
    permanentDeleteBlock,
    emptyTrash,
  } = useOutflow()

  const empty =
    trashProjects.length === 0 &&
    trashChats.length === 0 &&
    trashBlocks.length === 0

  if (empty) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        回收站为空。将侧栏项目、对话或软木板卡片拖入底部回收站，或点击块上的删除图标。
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-8">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            const total =
              trashProjects.length + trashChats.length + trashBlocks.length
            if (
              window.confirm(
                `确定清空回收站吗？将永久删除其中 ${total} 个项目/对话/内容块，且不可恢复。`,
              )
            ) {
              emptyTrash()
            }
          }}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
        >
          清空回收站
        </button>
      </div>

      {trashProjects.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            项目
          </h2>
          <ul className="space-y-3">
            {trashProjects.map((p) => (
              <ProjectTrashCard
                key={p.id}
                p={p}
                restoreProject={restoreProject}
                permanentDeleteProject={permanentDeleteProject}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {trashChats.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            对话
          </h2>
          <ul className="space-y-3">
            {trashChats.map((c) => (
              <ChatTrashCard
                key={c.id}
                c={c}
                allProjects={allProjects}
                restoreChat={restoreChat}
                permanentDeleteChat={permanentDeleteChat}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {trashBlocks.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            软木板卡片 / 内容块
          </h2>
          <ul className="space-y-3">
            {trashBlocks.map((b) => (
              <BlockTrashCard
                key={b.id}
                b={b}
                allChats={allChats}
                restoreBlock={restoreBlock}
                permanentDeleteBlock={permanentDeleteBlock}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
