import { useDndMonitor } from '@dnd-kit/core'
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'

const OutflowDndDraggingContext = createContext(false)

export function useOutflowDndDraggingActive() {
  return useContext(OutflowDndDraggingContext)
}

/** 必须作为 DndContext 的子节点渲染 */
export function OutflowDndDraggingBridge({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState(false)
  useDndMonitor({
    onDragStart: () => setDragging(true),
    onDragEnd: () => setDragging(false),
    onDragCancel: () => setDragging(false),
  })
  return (
    <OutflowDndDraggingContext.Provider value={dragging}>
      {children}
    </OutflowDndDraggingContext.Provider>
  )
}
