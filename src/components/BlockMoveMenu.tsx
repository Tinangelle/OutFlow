import { FolderOpen, MessageSquare } from 'lucide-react'
import { useMemo } from 'react'
import { useOutflow } from '../hooks/useOutflow'
import {
  sortedChatsInProject,
  sortedProjectsList,
  sortedStandaloneChats,
} from '../lib/storage'

export function BlockMoveMenu({
  blockId,
  currentChatId,
  onClose,
}: {
  blockId: string
  currentChatId: string
  onClose: () => void
}) {
  const { projects, chats, moveBlockToChat } = useOutflow()
  const projectList = useMemo(() => sortedProjectsList(projects), [projects])
  const standaloneList = useMemo(() => sortedStandaloneChats(chats), [chats])

  const moveTo = (chatId: string) => {
    if (chatId === currentChatId) return
    moveBlockToChat(blockId, chatId)
    onClose()
  }

  return (
    <div className="absolute right-0 top-9 z-30 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      <p className="px-2 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        移动到对话
      </p>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {projectList.map((project) => {
          const projectChats = sortedChatsInProject(chats, project.id)
          return (
            <div key={project.id} className="rounded-lg bg-zinc-50 p-1 dark:bg-zinc-800/40">
              <div className="mb-1 flex items-center gap-1.5 px-1.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                <FolderOpen className="h-3.5 w-3.5" />
                {project.title}
              </div>
              <div className="space-y-0.5">
                {projectChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => moveTo(chat.id)}
                    disabled={chat.id === currentChatId}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-violet-50 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-violet-950/40 dark:hover:text-violet-200"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {chat.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {standaloneList.length > 0 ? (
          <div className="rounded-lg bg-zinc-50 p-1 dark:bg-zinc-800/40">
            <div className="mb-1 px-1.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200">
              独立对话
            </div>
            <div className="space-y-0.5">
              {standaloneList.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => moveTo(chat.id)}
                  disabled={chat.id === currentChatId}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-violet-50 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-violet-950/40 dark:hover:text-violet-200"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {chat.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
