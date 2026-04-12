import type { Project } from '../types/outflow'
import { normalizeProjects } from './normalize'

export type ThemeMode = 'light' | 'dark'

export const STORAGE_KEY = 'outflow.v1'

export interface PersistedState {
  version: 1
  projects: Project[]
  activeProjectId: string | null
  theme: ThemeMode
}

export function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PersistedState
    if (data.version !== 1 || !Array.isArray(data.projects)) return null
    return { ...data, projects: normalizeProjects(data.projects) }
  } catch {
    return null
  }
}

export function savePersisted(data: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
