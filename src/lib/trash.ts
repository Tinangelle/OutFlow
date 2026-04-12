import type { Block, Chat, Project } from '../types/outflow'

export function isTrashed(entity: { deletedAt?: number }): boolean {
  return typeof entity.deletedAt === 'number'
}

export function projectVisible(p: Project): boolean {
  return !isTrashed(p)
}

/** 侧栏与主区：未删除且父项目存在且未删除 */
export function chatVisible(c: Chat, projects: Project[]): boolean {
  if (isTrashed(c)) return false
  if (c.projectId) {
    const p = projects.find((x) => x.id === c.projectId)
    if (!p || isTrashed(p)) return false
  }
  return true
}

export function blockVisible(
  b: Block,
  chats: Chat[],
  projects: Project[],
): boolean {
  if (isTrashed(b)) return false
  const chat = chats.find((c) => c.id === b.chatId)
  if (!chat) return false
  return chatVisible(chat, projects)
}

export function filterVisibleProjects(projects: Project[]): Project[] {
  return projects.filter(projectVisible)
}

export function filterVisibleChats(chats: Chat[], projects: Project[]): Chat[] {
  return chats.filter((c) => chatVisible(c, projects))
}
