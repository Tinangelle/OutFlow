import type { Block, Chat, Project } from '../types/outflow'
import { generateId } from './ids'
import { extractTagsFromContent } from './tags'

export function createBlock(
  chatId: string,
  content: string,
  orderIndex: number,
): Block {
  const t = Date.now()
  return {
    id: generateId(),
    chatId,
    content,
    orderIndex,
    createdAt: t,
    updatedAt: t,
    tags: extractTagsFromContent(content),
  }
}

/** 新建文件夹（Project） */
export function createProject(orderIndex: number, title?: string): Project {
  const t = Date.now()
  return {
    id: generateId(),
    title: title?.trim() || '未命名文件夹',
    orderIndex,
    createdAt: t,
    updatedAt: t,
  }
}

export function createChat(projectId: string | null, title?: string): Chat {
  const t = Date.now()
  return {
    id: generateId(),
    projectId,
    title: title?.trim() || '新对话',
    orderIndex: projectId ? 0 : undefined,
    createdAt: t,
    updatedAt: t,
  }
}
