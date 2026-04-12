import type { Block, Project } from '../types/outflow'
import { newId } from './ids'

export function createBlock(content: string, orderIndex: number): Block {
  const t = Date.now()
  return {
    id: newId(),
    content,
    orderIndex,
    createdAt: t,
    updatedAt: t,
  }
}

export function createProject(title?: string): Project {
  const t = Date.now()
  return {
    id: newId(),
    title: title?.trim() || '未命名项目',
    blocks: [],
    createdAt: t,
    updatedAt: t,
  }
}
