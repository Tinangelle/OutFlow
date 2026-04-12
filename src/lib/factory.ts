import type { Block, Chat, Project } from '../types/outflow'
import { newId } from './ids'

export function createBlock(
  chatId: string,
  content: string,
  orderIndex: number,
): Block {
  const t = Date.now()
  return {
    id: newId(),
    chatId,
    content,
    orderIndex,
    createdAt: t,
    updatedAt: t,
  }
}

/** 新建文件夹（Project） */
export function createProject(title?: string): Project {
  const t = Date.now()
  return {
    id: newId(),
    title: title?.trim() || '未命名文件夹',
    createdAt: t,
    updatedAt: t,
  }
}

export function createChat(projectId: string | null, title?: string): Chat {
  const t = Date.now()
  return {
    id: newId(),
    projectId,
    title: title?.trim() || '新对话',
    createdAt: t,
    updatedAt: t,
  }
}
