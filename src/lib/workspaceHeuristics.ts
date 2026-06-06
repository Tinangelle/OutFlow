import type { PersistedState } from './storage'

const DEFAULT_CHAT_TITLE = '新对话'

/** 是否仅为出厂默认空壳（无实质写作内容） */
export function isTrivialWorkspace(state: PersistedState): boolean {
  const hasContentBlocks = state.blocks.some((b) => b.content.trim().length > 0)
  if (hasContentBlocks) return false
  if (state.projects.length > 0) return false
  if (state.chats.length > 1) return false
  if (state.chats.length === 1) {
    const chat = state.chats[0]!
    const customTitle =
      Boolean(chat.title?.trim()) && chat.title !== DEFAULT_CHAT_TITLE
    if (customTitle || Boolean(chat.summary?.trim())) return false
  }
  return true
}

export function isSubstantiveWorkspace(state: PersistedState): boolean {
  return !isTrivialWorkspace(state)
}
