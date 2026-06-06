import { buildLocalBackupPayload } from './backup'
import { getSupabase } from './supabase'
import {
  bumpLocalRevision,
  computeStateRevision,
  effectiveLocalRevision,
  loadSyncMeta,
  markPushed,
  type SyncMeta,
} from './syncMeta'
import { STORAGE_KEY, tryParsePersistedState, type PersistedState } from './storage'
import {
  isSubstantiveWorkspace,
  isTrivialWorkspace,
} from './workspaceHeuristics'

type WorkspaceRow = {
  payload: unknown
  updated_at: string
}

export async function fetchCloudWorkspace(): Promise<{
  state: PersistedState
  updatedAt: string
} | null> {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('请先登录 Supabase 账号。')

  const { data, error } = await supabase
    .from('workspaces')
    .select('payload, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as WorkspaceRow
  const state = tryParsePersistedState(row.payload)
  if (!state) {
    throw new Error('云端工作区数据格式无效或已损坏。')
  }

  return { state, updatedAt: row.updated_at }
}

export type MergeResult = {
  state: PersistedState | null
  shouldPush: boolean
  syncMeta: SyncMeta
  source: 'local' | 'cloud' | 'none'
}

export function mergeLocalAndCloud(
  local: PersistedState | null,
  localRevision: number,
  cloud: { state: PersistedState; updatedAt: string } | null,
): MergeResult {
  const cloudRevision = cloud ? new Date(cloud.updatedAt).getTime() : 0
  const localIsTrivial = !local || isTrivialWorkspace(local)
  const cloudIsSubstantive =
    cloud !== null && isSubstantiveWorkspace(cloud.state)
  const localIsSubstantive =
    local !== null && isSubstantiveWorkspace(local)

  // 新设备/空壳本地绝不允许覆盖有内容的云端
  if (cloud && localIsTrivial && cloudIsSubstantive) {
    return {
      state: cloud.state,
      shouldPush: false,
      syncMeta: {
        localRevision: cloudRevision,
        lastPushedRevision: cloudRevision,
      },
      source: 'cloud',
    }
  }

  // 云端为空壳、本地有内容时优先本地
  if (
    local &&
    localIsSubstantive &&
    cloud &&
    isTrivialWorkspace(cloud.state)
  ) {
    const revision =
      localRevision > 0 ? localRevision : computeStateRevision(local)
    return {
      state: local,
      shouldPush: true,
      syncMeta: { localRevision: revision, lastPushedRevision: null },
      source: 'local',
    }
  }

  if (!cloud) {
    const revision =
      localRevision > 0
        ? localRevision
        : local
          ? computeStateRevision(local)
          : 0
    return {
      state: local,
      shouldPush: local !== null,
      syncMeta: { localRevision: revision, lastPushedRevision: null },
      source: local ? 'local' : 'none',
    }
  }

  if (!local) {
    return {
      state: cloud.state,
      shouldPush: false,
      syncMeta: {
        localRevision: cloudRevision,
        lastPushedRevision: cloudRevision,
      },
      source: 'cloud',
    }
  }

  if (cloudRevision > localRevision) {
    return {
      state: cloud.state,
      shouldPush: false,
      syncMeta: {
        localRevision: cloudRevision,
        lastPushedRevision: cloudRevision,
      },
      source: 'cloud',
    }
  }

  if (localRevision > cloudRevision) {
    return {
      state: local,
      shouldPush: true,
      syncMeta: { localRevision, lastPushedRevision: null },
      source: 'local',
    }
  }

  return {
    state: local,
    shouldPush: false,
    syncMeta: { localRevision, lastPushedRevision: localRevision },
    source: 'local',
  }
}

export async function resolveWorkspaceSync(
  local: PersistedState | null,
): Promise<MergeResult> {
  const meta = await loadSyncMeta()
  const localRevision = await effectiveLocalRevision(local, meta)
  const cloud = await fetchCloudWorkspace()
  return mergeLocalAndCloud(local, localRevision, cloud)
}

export async function uploadLocalWorkspaceToCloud(): Promise<void> {
  const payload = await buildLocalBackupPayload()
  const raw = payload.entries[STORAGE_KEY]
  const state = tryParsePersistedState(raw)
  if (!state) {
    throw new Error('本地工作区数据无效，无法上传到云端。')
  }
  await uploadWorkspaceToCloud(state)
  const meta = await loadSyncMeta()
  const revision =
    meta.localRevision > 0 ? meta.localRevision : computeStateRevision(state)
  await markPushed(revision)
}

export async function uploadWorkspaceToCloud(state: PersistedState): Promise<void> {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('请先登录 Supabase 账号。')

  const { error } = await supabase.from('workspaces').upsert({
    user_id: user.id,
    payload: state,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}

export async function pushWorkspaceIfNeeded(state: PersistedState): Promise<boolean> {
  if (isTrivialWorkspace(state)) {
    const cloud = await fetchCloudWorkspace()
    if (cloud && isSubstantiveWorkspace(cloud.state)) {
      return false
    }
  }

  const meta = await loadSyncMeta()
  if (
    meta.lastPushedRevision !== null &&
    meta.lastPushedRevision >= meta.localRevision
  ) {
    return false
  }
  await uploadWorkspaceToCloud(state)
  const latest = await loadSyncMeta()
  await markPushed(latest.localRevision)
  return true
}

export async function pushWorkspaceState(state: PersistedState): Promise<void> {
  if (isTrivialWorkspace(state)) {
    const cloud = await fetchCloudWorkspace()
    if (cloud && isSubstantiveWorkspace(cloud.state)) {
      throw new Error('本地工作区为空，已阻止上传以免覆盖云端数据。')
    }
  }

  await uploadWorkspaceToCloud(state)
  let meta = await loadSyncMeta()
  if (meta.localRevision <= 0) {
    meta = await bumpLocalRevision(state)
  }
  await markPushed(meta.localRevision)
}
