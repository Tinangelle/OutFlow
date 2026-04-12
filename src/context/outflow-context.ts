import { createContext } from 'react'
import type { ThemeMode } from '../lib/storage'
import type { Project } from '../types/outflow'

export interface OutflowContextValue {
  projects: Project[]
  activeProject: Project | null
  activeProjectId: string | null
  theme: ThemeMode
  selectProject: (id: string) => void
  newProject: () => void
  renameProject: (id: string, title: string) => void
  deleteProject: (id: string) => void
  setTheme: (theme: ThemeMode) => void
  addBlock: (content: string) => void
  updateBlock: (blockId: string, content: string) => void
  reorderBlocks: (orderedIds: string[]) => void
}

export const OutflowContext = createContext<OutflowContextValue | null>(null)
