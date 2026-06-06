import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  pushWorkspaceIfNeeded,
  pushWorkspaceState,
  resolveWorkspaceSync,
} from '../lib/cloudSync'
import { createBlock, createChat, createProject } from '../lib/factory'
import {
  loadPersisted,
  normalizePersistedState,
  savePersisted,
  type PersistedState,
  type ThemeMode,
} from '../lib/storage'
import { bumpLocalRevision, saveSyncMeta } from '../lib/syncMeta'
import { extractTagsFromContent } from '../lib/tags'
import {
  blockVisible,
  chatVisible,
  filterVisibleChats,
  filterVisibleProjects,
  isTrashed,
} from '../lib/trash'
import { useAuth } from '../hooks/useAuth'
import {
  OutflowContext,
  type CloudSyncStatus,
  type OutflowContextValue,
} from './outflow-context'

const AUTO_SYNC_DEBOUNCE_MS = 2500

function systemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function ensureActiveChat(state: PersistedState): PersistedState {
  const visible = filterVisibleChats(state.chats, state.projects).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )
  if (
    state.activeChatId &&
    visible.some((c) => c.id === state.activeChatId)
  ) {
    return state
  }
  if (visible.length === 0) {
    const c = createChat(null)
    return normalizePersistedState({
      ...state,
      chats: [...state.chats, c],
      activeChatId: c.id,
    })
  }
  return { ...state, activeChatId: visible[0]!.id }
}

function buildInitialState(loaded: PersistedState | null): PersistedState {
  if (loaded) {
    let next = normalizePersistedState(loaded)
    if (next.chats.length === 0) {
      const c = createChat(null)
      next = normalizePersistedState({
        ...next,
        chats: [c],
        activeChatId: c.id,
      })
    } else {
      next = ensureActiveChat(next)
    }
    return next
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

function OutflowBootLoading() {
  useLayoutEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      systemTheme() === 'dark',
    )
  }, [])
  return (
    <div className="flex h-full min-h-[100dvh] items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
      加载中…
    </div>
  )
}

function syncErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '云端同步失败。'
}

export function OutflowProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, configured: supabaseConfigured } =
    useAuth()
  const cloudSyncEnabled = supabaseConfigured && Boolean(user)
  const [initError, setInitError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(
    cloudSyncEnabled ? 'pending' : 'disabled',
  )
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null)
  /** 在 hydrated 之前为占位数据，不渲染子树，加载完成后由磁盘数据整体替换 */
  const [state, setState] = useState<PersistedState>(() =>
    buildInitialState(null),
  )
  const [trashWorkspace, setTrashWorkspace] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [globalSearchQuery, setGlobalSearchQueryRaw] = useState('')
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)
  const bootUserRef = useRef<string | undefined>(undefined)
  const initialBootDoneRef = useRef(false)
  const skipRevisionBumpRef = useRef(false)

  const setGlobalSearchQuery = useCallback((q: string) => {
    setActiveTagFilter(null)
    setGlobalSearchQueryRaw(q)
  }, [])

  const openTagFilterView = useCallback((tag: string) => {
    setTrashWorkspace(false)
    setGlobalSearchQueryRaw('')
    setActiveTagFilter(tag)
  }, [])

  const clearGlobalDiscovery = useCallback(() => {
    setGlobalSearchQueryRaw('')
    setActiveTagFilter(null)
  }, [])

  useEffect(() => {
    if (authLoading || initialBootDoneRef.current) return
    initialBootDoneRef.current = true

    let cancelled = false
    void (async () => {
      const { data: loaded, error: loadErr } = await loadPersisted()
      if (cancelled) return
      if (loadErr) setInitError(loadErr)

      let merged = loaded
      let shouldPush = false

      if (cloudSyncEnabled) {
        try {
          setCloudSyncStatus('syncing')
          const result = await resolveWorkspaceSync(loaded)
          merged = result.state
          shouldPush = result.shouldPush
          skipRevisionBumpRef.current = result.source === 'cloud'
          await saveSyncMeta(result.syncMeta)
          setCloudSyncError(null)
          setCloudSyncStatus('synced')
        } catch (err) {
          setCloudSyncError(syncErrorMessage(err))
          setCloudSyncStatus('error')
        }
      } else {
        setCloudSyncStatus('disabled')
      }

      const nextState = buildInitialState(merged)
      if (cancelled) return

      if (shouldPush && cloudSyncEnabled) {
        try {
          setCloudSyncStatus('syncing')
          await pushWorkspaceState(nextState)
          skipRevisionBumpRef.current = true
          setCloudSyncError(null)
          setCloudSyncStatus('synced')
        } catch (err) {
          setCloudSyncError(syncErrorMessage(err))
          setCloudSyncStatus('error')
        }
      }

      setState(nextState)
      setHydrated(true)
      bootUserRef.current = user?.id
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, cloudSyncEnabled, user?.id]) // cloudSyncEnabled/user 仅用于首次启动时的快照

  useEffect(() => {
    if (!hydrated || authLoading || !supabaseConfigured) return

    const uid = user?.id
    if (uid === bootUserRef.current) return

    bootUserRef.current = uid
    if (!uid) {
      setCloudSyncStatus('disabled')
      setCloudSyncError(null)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        setCloudSyncStatus('syncing')
        const { data: local } = await loadPersisted()
        const result = await resolveWorkspaceSync(local)
        if (cancelled) return

        skipRevisionBumpRef.current = result.source === 'cloud'
        await saveSyncMeta(result.syncMeta)

        const nextState = buildInitialState(result.state)

        if (result.shouldPush) {
          await pushWorkspaceState(nextState)
          skipRevisionBumpRef.current = true
        }

        setState(nextState)

        if (cancelled) return
        setCloudSyncError(null)
        setCloudSyncStatus('synced')
      } catch (err) {
        if (cancelled) return
        setCloudSyncError(syncErrorMessage(err))
        setCloudSyncStatus('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hydrated, authLoading, supabaseConfigured, user?.id])

  useEffect(() => {
    if (!hydrated) return
    void (async () => {
      await savePersisted(state)
      if (!skipRevisionBumpRef.current) {
        await bumpLocalRevision()
      } else {
        skipRevisionBumpRef.current = false
      }
    })()
    const isDark = state.theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#09090b' : '#fafafa')
  }, [state, hydrated])

  useEffect(() => {
    if (!hydrated || !cloudSyncEnabled) {
      if (!cloudSyncEnabled) {
        setCloudSyncStatus('disabled')
      }
      return
    }

    setCloudSyncStatus((prev) => (prev === 'syncing' ? prev : 'pending'))

    const timer = window.setTimeout(() => {
      void (async () => {
        setCloudSyncStatus('syncing')
        try {
          await pushWorkspaceIfNeeded(state)
          setCloudSyncError(null)
          setCloudSyncStatus('synced')
        } catch (err) {
          setCloudSyncError(syncErrorMessage(err))
          setCloudSyncStatus('error')
        }
      })()
    }, AUTO_SYNC_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [state, hydrated, cloudSyncEnabled])

  const activeProjectIdResolved = useMemo(() => {
    if (!activeProjectId) return null
    const exists = state.projects.some(
      (p) => p.id === activeProjectId && !isTrashed(p),
    )
    return exists ? activeProjectId : null
  }, [activeProjectId, state.projects])

  const selectChat = useCallback((id: string) => {
    setTrashWorkspace(false)
    setActiveProjectId(null)
    setGlobalSearchQuery('')
    setActiveTagFilter(null)
    setState((s) => {
      if (!s.chats.some((c) => c.id === id)) return s
      return { ...s, activeChatId: id }
    })
  }, [setGlobalSearchQuery])

  const selectProject = useCallback((id: string) => {
    setTrashWorkspace(false)
    setGlobalSearchQuery('')
    setActiveTagFilter(null)
    setActiveProjectId(id)
    setState((s) => ({ ...s, activeChatId: null }))
  }, [setGlobalSearchQuery])

  const openTrashWorkspace = useCallback(() => {
    setGlobalSearchQuery('')
    setActiveTagFilter(null)
    setTrashWorkspace(true)
    setActiveProjectId(null)
  }, [setGlobalSearchQuery])

  const newChat = useCallback(() => {
    setTrashWorkspace(false)
    setActiveProjectId(null)
    setGlobalSearchQuery('')
    setActiveTagFilter(null)
    const c = createChat(null)
    setState((s) =>
      normalizePersistedState({
        ...s,
        chats: [...s.chats, c],
        activeChatId: c.id,
      }),
    )
  }, [setGlobalSearchQuery])

  const newProject = useCallback(() => {
    setState((s) => {
      const maxOrder = s.projects.reduce((m, p) => Math.max(m, p.orderIndex), -1)
      return {
        ...s,
        projects: [...s.projects, createProject(maxOrder + 1)],
      }
    })
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

  const reorderProjects = useCallback((orderedIds: string[]) => {
    setState((s) => {
      const visible = s.projects.filter((p) => !isTrashed(p))
      const idSet = new Set(visible.map((p) => p.id))
      if (
        orderedIds.length !== visible.length ||
        !orderedIds.every((id) => idSet.has(id))
      ) {
        return s
      }
      const rank = new Map(orderedIds.map((id, i) => [id, i]))
      return {
        ...s,
        projects: s.projects.map((p) => {
          const nextOrder = rank.get(p.id)
          return nextOrder === undefined ? p : { ...p, orderIndex: nextOrder }
        }),
      }
    })
  }, [])

  const deleteProject = useCallback((id: string) => {
    const now = Date.now()
    setState((s) => {
      const next = {
        ...s,
        projects: s.projects.map((p) =>
          p.id !== id ? p : { ...p, deletedAt: now, updatedAt: now },
        ),
      }
      return ensureActiveChat(normalizePersistedState(next))
    })
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

  const updateChatSummary = useCallback((id: string, summary: string) => {
    const nextSummary = summary.replace(/\r\n/g, '\n').trim()
    const now = Date.now()
    setState((s) => ({
      ...s,
      chats: s.chats.map((c) =>
        c.id !== id ? c : { ...c, summary: nextSummary || undefined, updatedAt: now },
      ),
    }))
  }, [])

  const reorderChatsInProject = useCallback(
    (projectId: string, orderedIds: string[]) => {
      setState((s) => {
        const inProject = s.chats.filter(
          (c) => c.projectId === projectId && !isTrashed(c),
        )
        const idSet = new Set(inProject.map((c) => c.id))
        if (
          orderedIds.length !== inProject.length ||
          !orderedIds.every((id) => idSet.has(id))
        ) {
          return s
        }
        const rank = new Map(orderedIds.map((id, i) => [id, i]))
        const now = Date.now()
        return {
          ...s,
          chats: s.chats.map((c) => {
            const nextOrder = rank.get(c.id)
            return nextOrder === undefined
              ? c
              : { ...c, orderIndex: nextOrder, updatedAt: now }
          }),
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, updatedAt: now } : p,
          ),
        }
      })
    },
    [],
  )

  const deleteChat = useCallback((id: string) => {
    const now = Date.now()
    setState((s) => {
      const next = {
        ...s,
        chats: s.chats.map((c) =>
          c.id !== id ? c : { ...c, deletedAt: now, updatedAt: now },
        ),
      }
      return ensureActiveChat(normalizePersistedState(next))
    })
  }, [])

  const moveChatToProject = useCallback(
    (chatId: string, projectId: string | null) => {
      const now = Date.now()
      setState((s) => {
        const chat = s.chats.find((c) => c.id === chatId)
        if (!chat || isTrashed(chat)) return s
        if (projectId !== null) {
          const p = s.projects.find((x) => x.id === projectId)
          if (!p || isTrashed(p)) return s
          if (chat.projectId === projectId) return s
        } else if (chat.projectId === null) {
          return s
        }
        const targetOrderIndex =
          projectId === null
            ? undefined
            : s.chats
                .filter((c) => c.projectId === projectId && !isTrashed(c))
                .reduce((m, c) => Math.max(m, c.orderIndex ?? -1), -1) + 1
        return {
          ...s,
          chats: s.chats.map((c) =>
            c.id !== chatId
              ? c
              : { ...c, projectId, orderIndex: targetOrderIndex, updatedAt: now },
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
      if (!cid) return s
      const chat = s.chats.find((c) => c.id === cid)
      if (!chat || !chatVisible(chat, s.projects)) return s
      const inChat = s.blocks.filter(
        (b) => b.chatId === cid && !isTrashed(b),
      )
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
      const now = Date.now()
      const block = s.blocks.find((b) => b.id === blockId)
      if (!block || isTrashed(block)) return s
      const cid = block.chatId
      const chat = s.chats.find((c) => c.id === cid)
      if (!chat || !chatVisible(chat, s.projects)) return s
      return {
        ...s,
        blocks: s.blocks.map((b) =>
          b.id !== blockId
            ? b
            : {
                ...b,
                content: text,
                updatedAt: now,
                tags: extractTagsFromContent(text),
              },
        ),
        chats: s.chats.map((c) =>
          c.id !== cid ? c : { ...c, updatedAt: now },
        ),
      }
    })
  }, [])

  const updateBlockSummary = useCallback((blockId: string, summary: string) => {
    const nextSummary = summary.replace(/\r\n/g, '\n').trim()
    setState((s) => {
      const now = Date.now()
      const block = s.blocks.find((b) => b.id === blockId)
      if (!block || isTrashed(block)) return s
      const cid = block.chatId
      const chat = s.chats.find((c) => c.id === cid)
      if (!chat || !chatVisible(chat, s.projects)) return s
      return {
        ...s,
        blocks: s.blocks.map((b) =>
          b.id !== blockId
            ? b
            : {
                ...b,
                summary: nextSummary || undefined,
                updatedAt: now,
              },
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
      const chat = s.chats.find((c) => c.id === cid)
      if (!chat || !chatVisible(chat, s.projects)) return s
      const inChat = s.blocks.filter(
        (b) => b.chatId === cid && !isTrashed(b),
      )
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
      const rest = s.blocks.filter(
        (b) => b.chatId !== cid || isTrashed(b),
      )
      return {
        ...s,
        blocks: [...rest, ...reindexed],
        chats: s.chats.map((c) =>
          c.id !== cid ? c : { ...c, updatedAt: now },
        ),
      }
    })
  }, [])

  const softDeleteBlock = useCallback((blockId: string) => {
    const now = Date.now()
    setState((s) => ({
      ...s,
      blocks: s.blocks.map((b) =>
        b.id !== blockId ? b : { ...b, deletedAt: now, updatedAt: now },
      ),
    }))
  }, [])

  const moveBlockToChat = useCallback((blockId: string, targetChatId: string) => {
    setState((s) => {
      const block = s.blocks.find((b) => b.id === blockId)
      if (!block || isTrashed(block)) return s
      const targetChat = s.chats.find((c) => c.id === targetChatId)
      if (!targetChat || !chatVisible(targetChat, s.projects)) return s
      if (block.chatId === targetChatId) return s

      const now = Date.now()
      const targetBlocks = s.blocks.filter(
        (b) => b.chatId === targetChatId && !isTrashed(b),
      )
      const maxOrder = targetBlocks.reduce((m, b) => Math.max(m, b.orderIndex), -1)

      return {
        ...s,
        blocks: s.blocks.map((b) =>
          b.id !== blockId
            ? b
            : {
                ...b,
                chatId: targetChatId,
                orderIndex: maxOrder + 1,
                updatedAt: now,
              },
        ),
        chats: s.chats.map((c) =>
          c.id === targetChatId || c.id === block.chatId
            ? { ...c, updatedAt: now }
            : c,
        ),
      }
    })
  }, [])

  const restoreProject = useCallback((id: string) => {
    setState((s) =>
      ensureActiveChat(
        normalizePersistedState({
          ...s,
          projects: s.projects.map((p) =>
            p.id !== id ? p : { ...p, deletedAt: undefined },
          ),
        }),
      ),
    )
  }, [])

  const restoreChat = useCallback((id: string) => {
    setState((s) =>
      ensureActiveChat(
        normalizePersistedState({
          ...s,
          chats: s.chats.map((c) =>
            c.id !== id ? c : { ...c, deletedAt: undefined },
          ),
        }),
      ),
    )
  }, [])

  const restoreBlock = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      blocks: s.blocks.map((b) =>
        b.id !== id ? b : { ...b, deletedAt: undefined },
      ),
    }))
  }, [])

  const permanentDeleteProject = useCallback((id: string) => {
    setState((s) => {
      const next: PersistedState = {
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
        chats: s.chats.map((c) =>
          c.projectId === id ? { ...c, projectId: null } : c,
        ),
      }
      return ensureActiveChat(normalizePersistedState(next))
    })
  }, [])

  const permanentDeleteChat = useCallback((id: string) => {
    setState((s) => {
      const nextChats = s.chats.filter((c) => c.id !== id)
      const nextBlocks = s.blocks.filter((b) => b.chatId !== id)
      const next: PersistedState = {
        ...s,
        chats: nextChats,
        blocks: nextBlocks,
      }
      return ensureActiveChat(normalizePersistedState(next))
    })
  }, [])

  const permanentDeleteBlock = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      blocks: s.blocks.filter((b) => b.id !== id),
    }))
  }, [])

  const emptyTrash = useCallback(() => {
    setState((s) => {
      const trashedProjectIds = new Set(
        s.projects.filter(isTrashed).map((p) => p.id),
      )
      const next: PersistedState = {
        ...s,
        projects: s.projects.filter((p) => !isTrashed(p)),
        chats: s.chats
          .filter((c) => !isTrashed(c))
          .map((c) =>
            c.projectId && trashedProjectIds.has(c.projectId)
              ? { ...c, projectId: null }
              : c,
          ),
        blocks: s.blocks.filter((b) => !isTrashed(b)),
      }
      return ensureActiveChat(normalizePersistedState(next))
    })
  }, [])

  const activeChat = useMemo(() => {
    if (!state.activeChatId) return null
    const c = state.chats.find((x) => x.id === state.activeChatId) ?? null
    if (!c || !chatVisible(c, state.projects)) return null
    return c
  }, [state.chats, state.projects, state.activeChatId])

  const activeChatBlocks = useMemo(() => {
    if (!state.activeChatId) return []
    return state.blocks
      .filter((b) => blockVisible(b, state.chats, state.projects))
      .filter((b) => b.chatId === state.activeChatId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  }, [state.blocks, state.chats, state.projects, state.activeChatId])

  const projectsVisible = useMemo(
    () => filterVisibleProjects(state.projects),
    [state.projects],
  )

  const chatsVisible = useMemo(
    () => filterVisibleChats(state.chats, state.projects),
    [state.chats, state.projects],
  )

  const trashProjects = useMemo(
    () =>
      [...state.projects].filter(isTrashed).sort((a, b) => b.updatedAt - a.updatedAt),
    [state.projects],
  )

  const trashChats = useMemo(
    () =>
      [...state.chats].filter(isTrashed).sort((a, b) => b.updatedAt - a.updatedAt),
    [state.chats],
  )

  const trashBlocks = useMemo(
    () =>
      [...state.blocks].filter(isTrashed).sort((a, b) => b.updatedAt - a.updatedAt),
    [state.blocks],
  )

  const discoverableBlocks = useMemo(
    () =>
      state.blocks.filter((b) =>
        blockVisible(b, state.chats, state.projects),
      ),
    [state.blocks, state.chats, state.projects],
  )

  const aggregateTags = useMemo(() => {
    const s = new Set<string>()
    for (const b of discoverableBlocks) {
      for (const t of b.tags ?? []) {
        if (t) s.add(t)
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  }, [discoverableBlocks])

  const value = useMemo<OutflowContextValue>(
    () => ({
      projects: projectsVisible,
      chats: chatsVisible,
      activeChat,
      activeChatId: state.activeChatId,
      activeProjectId: activeProjectIdResolved,
      activeChatBlocks,
      theme: state.theme,
      trashWorkspace,
      trashProjects,
      trashChats,
      trashBlocks,
      allChats: state.chats,
      allProjects: state.projects,
      globalSearchQuery,
      setGlobalSearchQuery,
      activeTagFilter,
      openTagFilterView,
      clearGlobalDiscovery,
      discoverableBlocks,
      aggregateTags,
      selectChat,
      selectProject,
      openTrashWorkspace,
      newChat,
      newProject,
      renameProject,
      reorderProjects,
      deleteProject,
      renameChat,
      updateChatSummary,
      reorderChatsInProject,
      deleteChat,
      moveChatToProject,
      setTheme,
      addBlock,
      updateBlock,
      updateBlockSummary,
      reorderBlocks,
      softDeleteBlock,
      moveBlockToChat,
      restoreProject,
      restoreChat,
      restoreBlock,
      permanentDeleteProject,
      permanentDeleteChat,
      permanentDeleteBlock,
      emptyTrash,
      cloudSyncStatus,
      cloudSyncError,
    }),
    [
      projectsVisible,
      chatsVisible,
      activeChat,
      state.activeChatId,
      activeProjectIdResolved,
      activeChatBlocks,
      state.theme,
      trashWorkspace,
      trashProjects,
      trashChats,
      trashBlocks,
      state.chats,
      state.projects,
      globalSearchQuery,
      setGlobalSearchQuery,
      activeTagFilter,
      openTagFilterView,
      clearGlobalDiscovery,
      discoverableBlocks,
      aggregateTags,
      selectChat,
      selectProject,
      openTrashWorkspace,
      newChat,
      newProject,
      renameProject,
      reorderProjects,
      deleteProject,
      renameChat,
      updateChatSummary,
      reorderChatsInProject,
      deleteChat,
      moveChatToProject,
      setTheme,
      addBlock,
      updateBlock,
      updateBlockSummary,
      reorderBlocks,
      softDeleteBlock,
      moveBlockToChat,
      restoreProject,
      restoreChat,
      restoreBlock,
      permanentDeleteProject,
      permanentDeleteChat,
      permanentDeleteBlock,
      emptyTrash,
      cloudSyncStatus,
      cloudSyncError,
    ],
  )

  if (initError) {
    return (
      <div className="p-4 text-red-500 bg-white">
        初始化失败: {initError}
      </div>
    )
  }

  if (!hydrated) {
    return <OutflowBootLoading />
  }

  return (
    <OutflowContext.Provider value={value}>{children}</OutflowContext.Provider>
  )
}
