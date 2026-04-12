import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createBlock, createChat, createProject } from '../lib/factory'
import { sortChatsByUpdated } from '../lib/normalize'
import {
  loadPersisted,
  normalizePersistedState,
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
  if (loaded) {
    let chats = loaded.chats
    let activeChatId = loaded.activeChatId
    if (chats.length === 0) {
      const c = createChat(null)
      chats = [c]
      activeChatId = c.id
    } else if (
      !activeChatId ||
      !chats.some((c) => c.id === activeChatId)
    ) {
      activeChatId = sortChatsByUpdated(chats)[0]!.id
    }
    return normalizePersistedState({
      ...loaded,
      chats,
      activeChatId,
    })
  }
  const chat = createChat(null)
  return {
    version: 2,
    projects: [],
    chats: [chat],
    blocks: [],
    activeChatId: chat.id,
    theme: systemTheme(),
  }
}

export function OutflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState)

  useEffect(() => {
    savePersisted(state)
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }, [state])

  const selectChat = useCallback((id: string) => {
    setState((s) => (s.chats.some((c) => c.id === id) ? { ...s, activeChatId: id } : s))
  }, [])

  const newChat = useCallback(() => {
    const c = createChat(null)
    setState((s) => ({
      ...s,
      chats: [...s.chats, c],
      activeChatId: c.id,
    }))
  }, [])

  const newProject = useCallback(() => {
    const p = createProject()
    setState((s) => ({
      ...s,
      projects: [...s.projects, p],
    }))
  }, [])

  const renameProject = useCallback((id: string, title: string) => {
    const nextTitle = title.trim() || '未命名文件夹'
    const now = Date.now()
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id !== id ? p : { ...p, title: nextTitle, updatedAt: now },
      ),
    }))
  }, [])

  const deleteProject = useCallback((id: string) => {
    const now = Date.now()
    setState((s) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
      chats: s.chats.map((c) =>
        c.projectId !== id ? c : { ...c, projectId: null, updatedAt: now },
      ),
    }))
  }, [])

  const renameChat = useCallback((id: string, title: string) => {
    const nextTitle = title.trim() || '新对话'
    const now = Date.now()
    setState((s) => ({
      ...s,
      chats: s.chats.map((c) =>
        c.id !== id ? c : { ...c, title: nextTitle, updatedAt: now },
      ),
    }))
  }, [])

  const deleteChat = useCallback((id: string) => {
    setState((s) => {
      const nextChats = s.chats.filter((c) => c.id !== id)
      const nextBlocks = s.blocks.filter((b) => b.chatId !== id)
      if (nextChats.length === 0) {
        const c = createChat(null)
        return {
          ...s,
          chats: [c],
          blocks: [],
          activeChatId: c.id,
        }
      }
      const nextActive =
        s.activeChatId === id
          ? sortChatsByUpdated(nextChats)[0]!.id
          : s.activeChatId
      return {
        ...s,
        chats: nextChats,
        blocks: nextBlocks,
        activeChatId: nextActive,
      }
    })
  }, [])

  const moveChatToProject = useCallback(
    (chatId: string, projectId: string | null) => {
      const now = Date.now()
      setState((s) => {
        const chat = s.chats.find((c) => c.id === chatId)
        if (!chat) return s
        if (projectId !== null) {
          if (!s.projects.some((p) => p.id === projectId)) return s
          if (chat.projectId === projectId) return s
        } else if (chat.projectId === null) {
          return s
        }
        return {
          ...s,
          chats: s.chats.map((c) =>
            c.id !== chatId ? c : { ...c, projectId, updatedAt: now },
          ),
          projects:
            projectId !== null
              ? s.projects.map((p) =>
                  p.id !== projectId ? p : { ...p, updatedAt: now },
                )
              : s.projects,
        }
      })
    },
    [],
  )

  const setTheme = useCallback((theme: ThemeMode) => {
    setState((s) => ({ ...s, theme }))
  }, [])

  const addBlock = useCallback((content: string) => {
    const text = content.replace(/\r\n/g, '\n').trim()
    if (!text) return
    setState((s) => {
      const cid = s.activeChatId
      if (!cid || !s.chats.some((c) => c.id === cid)) return s
      const inChat = s.blocks.filter((b) => b.chatId === cid)
      const maxOrder = inChat.reduce((m, b) => Math.max(m, b.orderIndex), -1)
      const block = createBlock(cid, text, maxOrder + 1)
      const now = Date.now()
      return {
        ...s,
        blocks: [...s.blocks, block],
        chats: s.chats.map((c) =>
          c.id !== cid ? c : { ...c, updatedAt: now },
        ),
      }
    })
  }, [])

  const updateBlock = useCallback((blockId: string, content: string) => {
    const text = content.replace(/\r\n/g, '\n')
    setState((s) => {
      const cid = s.activeChatId
      if (!cid) return s
      const now = Date.now()
      const touches = s.blocks.some(
        (b) => b.id === blockId && b.chatId === cid,
      )
      if (!touches) return s
      return {
        ...s,
        blocks: s.blocks.map((b) =>
          b.id !== blockId ? b : { ...b, content: text, updatedAt: now },
        ),
        chats: s.chats.map((c) =>
          c.id !== cid ? c : { ...c, updatedAt: now },
        ),
      }
    })
  }, [])

  const reorderBlocks = useCallback((orderedIds: string[]) => {
    setState((s) => {
      const cid = s.activeChatId
      if (!cid) return s
      const now = Date.now()
      const inChat = s.blocks.filter((b) => b.chatId === cid)
      const idSet = new Set(inChat.map((b) => b.id))
      if (
        orderedIds.length !== inChat.length ||
        !orderedIds.every((id) => idSet.has(id))
      ) {
        return s
      }
      const byId = new Map(inChat.map((b) => [b.id, b]))
      const reindexed = orderedIds.map((id, i) => {
        const b = byId.get(id)!
        return { ...b, orderIndex: i, updatedAt: now }
      })
      const rest = s.blocks.filter((b) => b.chatId !== cid)
      return {
        ...s,
        blocks: [...rest, ...reindexed],
        chats: s.chats.map((c) =>
          c.id !== cid ? c : { ...c, updatedAt: now },
        ),
      }
    })
  }, [])

  const activeChat = useMemo(() => {
    if (!state.activeChatId) return null
    return state.chats.find((c) => c.id === state.activeChatId) ?? null
  }, [state.chats, state.activeChatId])

  const activeChatBlocks = useMemo(() => {
    if (!state.activeChatId) return []
    return state.blocks
      .filter((b) => b.chatId === state.activeChatId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  }, [state.blocks, state.activeChatId])

  const value = useMemo<OutflowContextValue>(
    () => ({
      projects: state.projects,
      chats: state.chats,
      activeChat,
      activeChatId: state.activeChatId,
      activeChatBlocks,
      theme: state.theme,
      selectChat,
      newChat,
      newProject,
      renameProject,
      deleteProject,
      renameChat,
      deleteChat,
      moveChatToProject,
      setTheme,
      addBlock,
      updateBlock,
      reorderBlocks,
    }),
    [
      state.projects,
      state.chats,
      state.activeChatId,
      state.theme,
      activeChat,
      activeChatBlocks,
      selectChat,
      newChat,
      newProject,
      renameProject,
      deleteProject,
      renameChat,
      deleteChat,
      moveChatToProject,
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
