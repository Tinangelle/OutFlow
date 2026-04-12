import { useContext } from 'react'
import {
  OutflowContext,
  type OutflowContextValue,
} from '../context/outflow-context'

export function useOutflow(): OutflowContextValue {
  const ctx = useContext(OutflowContext)
  if (!ctx) throw new Error('useOutflow must be used within OutflowProvider')
  return ctx
}
