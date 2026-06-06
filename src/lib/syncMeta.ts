import localforage from 'localforage'
import type { PersistedState } from './storage'

export const SYNC_META_KEY = 'outflow.syncMeta'

export type SyncMeta = {
  localRevision: number
  lastPushedRevision: number | null
}

const DEFAULT_META: SyncMeta = {
  localRevision: 0,
  lastPushedRevision: null,
}

export function computeStateRevision(state: PersistedState): number {
  let max = 0
  for (const project of state.projects) {
    max = Math.max(max, project.updatedAt)
  }
  for (const chat of state.chats) {
    max = Math.max(max, chat.updatedAt)
  }
  for (const block of state.blocks) {
    max = Math.max(max, block.updatedAt)
  }
  return max
}

export async function loadSyncMeta(): Promise<SyncMeta> {
  const raw = await localforage.getItem<unknown>(SYNC_META_KEY)
  if (typeof raw === 'object' && raw !== null) {
    const row = raw as Record<string, unknown>
    if (typeof row.localRevision === 'number') {
      return {
        localRevision: row.localRevision,
        lastPushedRevision:
          typeof row.lastPushedRevision === 'number'
            ? row.lastPushedRevision
            : null,
      }
    }
  }
  return { ...DEFAULT_META }
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
  await localforage.setItem(SYNC_META_KEY, meta)
}

export async function bumpLocalRevision(state: PersistedState): Promise<SyncMeta> {
  const meta = await loadSyncMeta()
  const contentRev = computeStateRevision(state)
  const nextRevision = Math.max(meta.localRevision, contentRev)
  if (nextRevision === meta.localRevision) return meta
  const next: SyncMeta = { ...meta, localRevision: nextRevision }
  await saveSyncMeta(next)
  return next
}

export async function markPushed(revision: number): Promise<void> {
  const meta = await loadSyncMeta()
  await saveSyncMeta({ ...meta, lastPushedRevision: revision })
}

export async function resetSyncMetaAfterImport(state: PersistedState): Promise<void> {
  const revision = Math.max(Date.now(), computeStateRevision(state))
  await saveSyncMeta({ localRevision: revision, lastPushedRevision: null })
}

export async function effectiveLocalRevision(
  local: PersistedState | null,
  meta: SyncMeta,
): Promise<number> {
  if (meta.localRevision > 0) return meta.localRevision
  if (local) return computeStateRevision(local)
  return 0
}
