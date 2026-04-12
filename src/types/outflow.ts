/** 单条气泡 / 内容块 */
export interface Block {
  id: string
  /** Markdown 源文本 */
  content: string
  /** 项目内排序权重，升序排列 */
  orderIndex: number
  createdAt: number
  updatedAt: number
}

/** 项目：一组 Block 的容器 */
export interface Project {
  id: string
  title: string
  blocks: Block[]
  createdAt: number
  updatedAt: number
}
