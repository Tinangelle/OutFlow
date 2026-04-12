import type { Project } from '../types/outflow'

/** 确保每个 Block 有 orderIndex；缺失时按 createdAt 升序补齐并压平为 0..n-1 */
export function normalizeProjects(projects: Project[]): Project[] {
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
