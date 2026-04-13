/** 文本块，隶属于某个 Chat */
export interface Block {
  id: string
  chatId: string
  /** 预留：后续用于卡片标题展示 */
  title?: string
  /** 卡片提要/大纲 */
  summary?: string
  /** Markdown 源文本 */
  content: string
  /** 对话内排序，升序 */
  orderIndex: number
  createdAt: number
  updatedAt: number
  /** 由正文自动提取的 【词】 / #词，已去重 */
  tags?: string[]
  /** 有值表示已软删除（回收站） */
  deletedAt?: number
}

/** 文件夹（类似 ChatGPT 侧栏中的 Project） */
export interface Project {
  id: string
  title: string
  /** 侧栏内排序，升序 */
  orderIndex: number
  createdAt: number
  updatedAt: number
  /** 有值表示已软删除（回收站） */
  deletedAt?: number
}

/** 对话文件，可挂在某文件夹下或独立（projectId 为 null） */
export interface Chat {
  id: string
  projectId: string | null
  title: string
  /** 对话提要/大纲 */
  summary?: string
  /** Project 内排序（可选，用于拖拽） */
  orderIndex?: number
  createdAt: number
  updatedAt: number
  /** 有值表示已软删除（回收站） */
  deletedAt?: number
}
