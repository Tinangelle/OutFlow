import localforage from 'localforage'
import type { Block, Chat, Project } from '../types/outflow'
import { generateId } from './ids'
import { sortChatsByUpdated, sortProjectsByUpdated } from './normalize'
import { extractTagsFromContent } from './tags'

export type ThemeMode = 'light' | 'dark'

localforage.config({
  name: 'OutFlowDB',
  storeName: 'workspace',
})

/** 当前持久化版本（localforage / 曾用 localStorage 的 key） */
export const STORAGE_KEY = 'outflow.v2'
/** 旧版 key，仅用于一次性迁移 */
const STORAGE_KEY_LEGACY_V1 = 'outflow.v1'

/** —— V1 磁盘结构（迁移用）—— */
interface BlockV1 {
  id: string
  content: string
  orderIndex: number
  createdAt: number
  updatedAt: number
}

interface ProjectV1 {
  id: string
  title: string
  blocks: BlockV1[]
  createdAt: number
  updatedAt: number
}

interface PersistedStateV1 {
  version: 1
  projects: ProjectV1[]
  activeProjectId: string | null
  theme: ThemeMode
}

function normalizeV1Projects(projects: ProjectV1[]): ProjectV1[] {
  return projects.map((p) => {
    const missing = p.blocks.some((b) => typeof b.orderIndex !== 'number')
    const ordered = missing
      ? [...p.blocks].sort((a, b) => a.createdAt - b.createdAt)
      : [...p.blocks].sort((a, b) => a.orderIndex - b.orderIndex)
    return {
      ...p,
      blocks: ordered.map((b, i) => ({ ...b, orderIndex: i })),
    }
  })
}

export interface PersistedState {
  version: 2
  projects: Project[]
  chats: Chat[]
  blocks: Block[]
  activeChatId: string | null
  theme: ThemeMode
}

function sortBlocksInChat(blocks: Block[], chatId: string): Block[] {
  const inChat = blocks.filter((b) => b.chatId === chatId)
  const missing = inChat.some((b) => typeof b.orderIndex !== 'number')
  const ordered = missing
    ? [...inChat].sort((a, b) => a.createdAt - b.createdAt)
    : [...inChat].sort((a, b) => a.orderIndex - b.orderIndex)
  return ordered.map((b, i) => ({ ...b, orderIndex: i }))
}

/** 按对话整理 Block 的 orderIndex，并丢弃孤儿块 */
export function normalizePersistedState(state: PersistedState): PersistedState {
  const chatIds = new Set(state.chats.map((c) => c.id))
  const kept = state.blocks
    .filter((b) => chatIds.has(b.chatId))
    .map((b) =>
      b.tags === undefined
        ? { ...b, tags: extractTagsFromContent(b.content) }
        : b,
    )
  const nextBlocks: Block[] = []
  for (const chat of state.chats) {
    nextBlocks.push(...sortBlocksInChat(kept, chat.id))
  }
  return { ...state, blocks: nextBlocks }
}

export function migrateV1ToV2(v1: PersistedStateV1): PersistedState {
  const projectsNorm = normalizeV1Projects(v1.projects)
  const chats: Chat[] = projectsNorm.map((p) => ({
    id: p.id,
    projectId: null,
    title: p.title,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))
  const blocks: Block[] = []
  for (const p of projectsNorm) {
    for (const b of p.blocks) {
      blocks.push({
        id: b.id,
        chatId: p.id,
        content: b.content,
        orderIndex: b.orderIndex,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })
    }
  }
  let activeChatId: string | null =
    v1.activeProjectId && chats.some((c) => c.id === v1.activeProjectId)
      ? v1.activeProjectId
      : chats[0]?.id ?? null
  if (!activeChatId && chats.length === 0) {
    const t = Date.now()
    const id = generateId()
    chats.push({
      id,
      projectId: null,
      title: '新对话',
      createdAt: t,
      updatedAt: t,
    })
    activeChatId = id
  }
  return {
    version: 2,
    projects: [],
    chats,
    blocks,
    activeChatId,
    theme: v1.theme,
  }
}

function parsePersistedPayload(data: unknown): PersistedState | null {
  try {
    const obj: unknown =
      typeof data === 'string' ? JSON.parse(data) : data
    if (
      !obj ||
      typeof obj !== 'object' ||
      (obj as PersistedState).version !== 2
    ) {
      return null
    }
    const d = obj as PersistedState
    if (
      !Array.isArray(d.projects) ||
      !Array.isArray(d.chats) ||
      !Array.isArray(d.blocks)
    ) {
      return null
    }
    return normalizePersistedState(d)
  } catch {
    return null
  }
}

/** 校验并规范化备份中的工作区快照（version 2 + projects/chats/blocks） */
export function tryParsePersistedState(data: unknown): PersistedState | null {
  return parsePersistedPayload(data)
}

async function saveToStore(state: PersistedState): Promise<void> {
  await localforage.setItem(STORAGE_KEY, state)
}

async function loadAndMigrateLegacyV1FromLocalStorage(): Promise<PersistedState | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEGACY_V1)
    if (!raw) return null
    const data = JSON.parse(raw) as PersistedStateV1
    if (data.version !== 1 || !Array.isArray(data.projects)) return null
    const migrated = migrateV1ToV2(data)
    const normalized = normalizePersistedState(migrated)
    await saveToStore(normalized)
    localStorage.removeItem(STORAGE_KEY_LEGACY_V1)
    return normalized
  } catch {
    return null
  }
}

/** 若 IndexedDB 为空但 localStorage 仍有 v2 数据，则导入并清理 localStorage */
async function migrateV2FromLocalStorageIfPresent(): Promise<PersistedState | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const v2 = parsePersistedPayload(raw)
    if (!v2) return null
    await saveToStore(v2)
    localStorage.removeItem(STORAGE_KEY)
    return v2
  } catch {
    return null
  }
}

export type LoadPersistedResult = {
  data: PersistedState | null
  /** IndexedDB / 迁移过程抛错时由调用方展示 */
  error: string | null
}

function loadErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * 从 IndexedDB 读取；若无数据则从 localStorage 静默迁移（v2 或 v1）。
 */
export async function loadPersisted(): Promise<LoadPersistedResult> {
  try {
    const fromIdb = await localforage.getItem<unknown>(STORAGE_KEY)
    const v2FromIdb = parsePersistedPayload(fromIdb)
    if (v2FromIdb) return { data: v2FromIdb, error: null }

    const fromLsV2 = await migrateV2FromLocalStorageIfPresent()
    if (fromLsV2) return { data: fromLsV2, error: null }

    const legacy = await loadAndMigrateLegacyV1FromLocalStorage()
    return { data: legacy, error: null }
  } catch (err) {
    return { data: null, error: loadErrorMessage(err) }
  }
}

export async function savePersisted(data: PersistedState): Promise<void> {
  await saveToStore(data)
}

/** 侧栏展示顺序辅助 */
export function sortedProjectsList(projects: Project[]): Project[] {
  return sortProjectsByUpdated(projects)
}

export function sortedChatsInProject(
  chats: Chat[],
  projectId: string,
): Chat[] {
  return sortChatsByUpdated(chats.filter((c) => c.projectId === projectId))
}

export function sortedStandaloneChats(chats: Chat[]): Chat[] {
  return sortChatsByUpdated(chats.filter((c) => c.projectId === null))
}
