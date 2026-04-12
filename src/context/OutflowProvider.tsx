import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createBlock, createProject } from '../lib/factory'
import {
  loadPersisted,
  savePersisted,
  type PersistedState,
  type ThemeMode,
} from '../lib/storage'
import { OutflowContext, type OutflowContextValue } from './outflow-context'

function systemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function initialState(): PersistedState {
  const loaded = loadPersisted()
  if (loaded && loaded.projects.length > 0) {
    const active =
      loaded.activeProjectId &&
      loaded.projects.some((p) => p.id === loaded.activeProjectId)
        ? loaded.activeProjectId
        : loaded.projects[0].id
    return { ...loaded, activeProjectId: active }
  }
  const p = createProject()
  return {
    version: 1,
    projects: [p],
    activeProjectId: p.id,
    theme: systemTheme(),
  }
}

export function OutflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState)

  useEffect(() => {
    savePersisted(state)
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }, [state])

  const selectProject = useCallback((id: string) => {
    setState((s) => ({ ...s, activeProjectId: id }))
  }, [])

  const newProject = useCallback(() => {
    const p = createProject()
    setState((s) => ({
      ...s,
      projects: [...s.projects, p],
      activeProjectId: p.id,
    }))
  }, [])

  const renameProject = useCallback((id: string, title: string) => {
    const nextTitle = title.trim() || '未命名项目'
    const now = Date.now()
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id !== id ? p : { ...p, title: nextTitle, updatedAt: now },
      ),
    }))
  }, [])

  const deleteProject = useCallback((id: string) => {
    setState((s) => {
      const next = s.projects.filter((p) => p.id !== id)
      if (next.length === 0) {
        const p = createProject()
        return { ...s, projects: [p], activeProjectId: p.id }
      }
      const active =
        s.activeProjectId === id ? next[0].id : s.activeProjectId
      return { ...s, projects: next, activeProjectId: active }
    })
  }, [])

  const setTheme = useCallback((theme: ThemeMode) => {
    setState((s) => ({ ...s, theme }))
  }, [])

  const addBlock = useCallback((content: string) => {
    const text = content.replace(/\r\n/g, '\n').trim()
    if (!text) return
    setState((s) => {
      const pid = s.activeProjectId
      if (!pid) return s
      const proj = s.projects.find((p) => p.id === pid)
      if (!proj) return s
      const maxOrder = proj.blocks.reduce(
        (m, b) => Math.max(m, b.orderIndex),
        -1,
      )
      const block = createBlock(text, maxOrder + 1)
      const now = Date.now()
      return {
        ...s,
        projects: s.projects.map((p) =>
          p.id !== pid
            ? p
            : {
                ...p,
                blocks: [...p.blocks, block],
                updatedAt: now,
              },
        ),
      }
    })
  }, [])

  const updateBlock = useCallback((blockId: string, content: string) => {
    const text = content.replace(/\r\n/g, '\n')
    setState((s) => {
      const pid = s.activeProjectId
      if (!pid) return s
      const now = Date.now()
      return {
        ...s,
        projects: s.projects.map((p) => {
          if (p.id !== pid) return p
          return {
            ...p,
            blocks: p.blocks.map((b) =>
              b.id !== blockId
                ? b
                : { ...b, content: text, updatedAt: now },
            ),
            updatedAt: now,
          }
        }),
      }
    })
  }, [])

  const reorderBlocks = useCallback((orderedIds: string[]) => {
    setState((s) => {
      const pid = s.activeProjectId
      if (!pid) return s
      const now = Date.now()
      return {
        ...s,
        projects: s.projects.map((p) => {
          if (p.id !== pid) return p
          const idSet = new Set(p.blocks.map((b) => b.id))
          if (
            orderedIds.length !== p.blocks.length ||
            !orderedIds.every((id) => idSet.has(id))
          ) {
            return p
          }
          const byId = new Map(p.blocks.map((b) => [b.id, b]))
          const blocks = orderedIds.map((id, i) => {
            const b = byId.get(id)!
            return { ...b, orderIndex: i, updatedAt: now }
          })
          return { ...p, blocks, updatedAt: now }
        }),
      }
    })
  }, [])

  const activeProject = useMemo(() => {
    if (!state.activeProjectId) return null
    return (
      state.projects.find((p) => p.id === state.activeProjectId) ?? null
    )
  }, [state.projects, state.activeProjectId])

  const value = useMemo<OutflowContextValue>(
    () => ({
      projects: state.projects,
      activeProject,
      activeProjectId: state.activeProjectId,
      theme: state.theme,
      selectProject,
      newProject,
      renameProject,
      deleteProject,
      setTheme,
      addBlock,
      updateBlock,
      reorderBlocks,
    }),
    [
      state.projects,
      state.activeProjectId,
      state.theme,
      activeProject,
      selectProject,
      newProject,
      renameProject,
      deleteProject,
      setTheme,
      addBlock,
      updateBlock,
      reorderBlocks,
    ],
  )

  return (
    <OutflowContext.Provider value={value}>{children}</OutflowContext.Provider>
  )
}
