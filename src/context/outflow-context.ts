import { createContext } from 'react'
import type { ThemeMode } from '../lib/storage'
import type { Block, Chat, Project } from '../types/outflow'

export interface OutflowContextValue {
  projects: Project[]
  chats: Chat[]
  activeChat: Chat | null
  activeChatId: string | null
  activeChatBlocks: Block[]
  theme: ThemeMode
  selectChat: (id: string) => void
  newChat: () => void
  /** 新建文件夹（Project） */
  newProject: () => void
  renameProject: (id: string, title: string) => void
  deleteProject: (id: string) => void
  renameChat: (id: string, title: string) => void
  deleteChat: (id: string) => void
  moveChatToProject: (chatId: string, projectId: string | null) => void
  setTheme: (theme: ThemeMode) => void
  addBlock: (content: string) => void
  updateBlock: (blockId: string, content: string) => void
  reorderBlocks: (orderedIds: string[]) => void
}

export const OutflowContext = createContext<OutflowContextValue | null>(null)
