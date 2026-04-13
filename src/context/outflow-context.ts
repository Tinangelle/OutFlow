import { createContext } from 'react'
import type { ThemeMode } from '../lib/storage'
import type { Block, Chat, Project } from '../types/outflow'

export interface OutflowContextValue {
  /** 未删除且可用的项目（侧栏「项目」） */
  projects: Project[]
  /** 未删除且父项目可用的对话 */
  chats: Chat[]
  activeChat: Chat | null
  activeChatId: string | null
  activeProjectId: string | null
  /** 当前对话内未删除的块 */
  activeChatBlocks: Block[]
  theme: ThemeMode
  /** 主区是否为回收站视图 */
  trashWorkspace: boolean
  /** 回收站中的项目 */
  trashProjects: Project[]
  /** 回收站中的对话 */
  trashChats: Chat[]
  /** 回收站中的块 */
  trashBlocks: Block[]
  /** 含已软删除项，仅供回收站界面解析标题与关联 */
  allChats: Chat[]
  allProjects: Project[]
  /** 侧栏/全局搜索关键词（会清空标签聚合视图） */
  globalSearchQuery: string
  setGlobalSearchQuery: (q: string) => void
  /** 非空时主区为标签聚合视图 */
  activeTagFilter: string | null
  openTagFilterView: (tag: string) => void
  clearGlobalDiscovery: () => void
  /** 未删除且所属对话/项目可用的块，用于搜索与标签聚合 */
  discoverableBlocks: Block[]
  /** 上述块中出现的全部标签，已排序 */
  aggregateTags: string[]

  selectChat: (id: string) => void
  selectProject: (id: string) => void
  openTrashWorkspace: () => void
  newChat: () => void
  /** 新建项目（Project） */
  newProject: () => void
  renameProject: (id: string, title: string) => void
  reorderProjects: (orderedIds: string[]) => void
  /** 软删除项目（移入回收站） */
  deleteProject: (id: string) => void
  renameChat: (id: string, title: string) => void
  updateChatSummary: (id: string, summary: string) => void
  reorderChatsInProject: (projectId: string, orderedIds: string[]) => void
  /** 软删除对话（移入回收站） */
  deleteChat: (id: string) => void
  moveChatToProject: (chatId: string, projectId: string | null) => void
  setTheme: (theme: ThemeMode) => void
  addBlock: (content: string) => void
  updateBlock: (blockId: string, content: string) => void
  updateBlockSummary: (blockId: string, summary: string) => void
  reorderBlocks: (orderedIds: string[]) => void
  /** 软删除块（移入回收站） */
  softDeleteBlock: (blockId: string) => void
  moveBlockToChat: (blockId: string, targetChatId: string) => void

  restoreProject: (id: string) => void
  restoreChat: (id: string) => void
  restoreBlock: (id: string) => void
  permanentDeleteProject: (id: string) => void
  permanentDeleteChat: (id: string) => void
  permanentDeleteBlock: (id: string) => void
  emptyTrash: () => void
}

export const OutflowContext = createContext<OutflowContextValue | null>(null)
