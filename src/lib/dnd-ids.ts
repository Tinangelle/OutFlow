/** draggable：对话行 */
export const dragTypeChat = 'sidebar-chat'
/** draggable：项目行 */
export const dragTypeProject = 'sidebar-project'
/** draggable：软木板卡片 */
export const dragTypeBlock = 'board-block'

/** droppable：项目归档区 */
export const dropTypeProject = 'sidebar-project-drop'
/** droppable：独立对话根区 */
export const dropTypeStandaloneRoot = 'sidebar-standalone-root'
/** droppable：回收站 */
export const dropTypeTrash = 'sidebar-trash'

export function sidebarChatDndId(chatId: string): string {
  return `sidebar-chat-${chatId}`
}

export function sidebarProjectDndId(projectId: string): string {
  return `sidebar-project-${projectId}`
}
