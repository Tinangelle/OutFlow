import { ArrowDownAZ, ArrowUpAZ, Hash, MessageSquare } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useOutflow } from '../hooks/useOutflow'
import type { Block, Chat, Project } from '../types/outflow'

function snippet(text: string, max = 200): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return '（空内容）'
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

function contentMatchesQuery(content: string, q: string): boolean {
  const nq = q.trim().toLowerCase()
  if (!nq) return false
  return content.toLowerCase().includes(nq)
}

function resolveMeta(
  block: Block,
  allChats: Chat[],
  allProjects: Project[],
): { chatTitle: string; projectLine: string } {
  const chat = allChats.find((c) => c.id === block.chatId)
  if (!chat) {
    return { chatTitle: '（未知对话）', projectLine: '—' }
  }
  if (!chat.projectId) {
    return { chatTitle: chat.title, projectLine: '独立对话' }
  }
  const proj = allProjects.find((p) => p.id === chat.projectId)
  const projectTitle = proj?.title ?? '（项目）'
  return { chatTitle: chat.title, projectLine: `项目 · ${projectTitle}` }
}

export function DiscoveryWorkspace() {
  const {
    globalSearchQuery,
    activeTagFilter,
    discoverableBlocks,
    allChats,
    allProjects,
    selectChat,
  } = useOutflow()

  const [tagSortNewestFirst, setTagSortNewestFirst] = useState(true)

  const searchResults = useMemo(() => {
    const q = globalSearchQuery.trim()
    if (!q) return []
    return discoverableBlocks
      .filter((b) => contentMatchesQuery(b.content, q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [discoverableBlocks, globalSearchQuery])

  const tagResults = useMemo(() => {
    if (!activeTagFilter) return []
    return discoverableBlocks
      .filter((b) => (b.tags ?? []).includes(activeTagFilter))
      .sort((a, b) =>
        tagSortNewestFirst
          ? b.updatedAt - a.updatedAt
          : a.updatedAt - b.updatedAt,
      )
  }, [activeTagFilter, discoverableBlocks, tagSortNewestFirst])

  const openInChat = useCallback(
    (chatId: string) => {
      selectChat(chatId)
    },
    [selectChat],
  )

  if (activeTagFilter) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap select-none items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Hash className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span>
              标签「
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {activeTagFilter}
              </span>
              」· {tagResults.length} 条
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTagSortNewestFirst((v) => !v)}
            className="flex select-none items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            title="切换排序"
          >
            {tagSortNewestFirst ? (
              <>
                <ArrowDownAZ className="h-3.5 w-3.5" />
                时间倒序
              </>
            ) : (
              <>
                <ArrowUpAZ className="h-3.5 w-3.5" />
                时间正序
              </>
            )}
          </button>
        </div>

        {tagResults.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            暂无包含此标签的气泡。
          </p>
        ) : (
          <ul className="space-y-3">
            {tagResults.map((b) => {
              const { chatTitle, projectLine } = resolveMeta(
                b,
                allChats,
                allProjects,
              )
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => openInChat(b.chatId)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-violet-600"
                  >
                    <div className="flex flex-wrap select-none items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {projectLine}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {chatTitle}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500">
                        {new Date(b.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 select-text text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {snippet(b.content)}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  const q = globalSearchQuery.trim()
  if (!q) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        在侧栏输入关键词以搜索所有气泡正文。
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        搜索「<span className="font-semibold text-zinc-900 dark:text-zinc-100">{q}</span>
        」· {searchResults.length} 条结果
      </p>
      {searchResults.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          没有匹配的气泡，可尝试其他关键词。
        </p>
      ) : (
        <ul className="space-y-3">
          {searchResults.map((b) => {
            const { chatTitle, projectLine } = resolveMeta(
              b,
              allChats,
              allProjects,
            )
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => openInChat(b.chatId)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-violet-600"
                >
                  <div className="flex flex-wrap select-none items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {projectLine}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {chatTitle}
                    </span>
                  </div>
                  <p className="mt-2 select-text text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {snippet(b.content)}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
