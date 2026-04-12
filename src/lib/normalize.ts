import type { Chat, Project } from '../types/outflow'

export function sortChatsByUpdated(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function sortProjectsByUpdated(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
}
