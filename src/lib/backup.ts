import localforage from 'localforage'
import { STORAGE_KEY, tryParsePersistedState } from './storage'

export const OUTFLOW_BACKUP_FORMAT = 1 as const

export type OutflowLocalBackupFile = {
  outflowBackupFormat: typeof OUTFLOW_BACKUP_FORMAT
  exportedAt: string
  /** localforage 键值全量快照（当前主要为 outflow.v2） */
  entries: Record<string, unknown>
}

function localDateYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function backupDownloadFilename(): string {
  return `outflow-backup-${localDateYmd()}.json`
}

export async function collectLocalforageEntries(): Promise<
  Record<string, unknown>
> {
  const entries: Record<string, unknown> = {}
  await localforage.iterate((value, key) => {
    entries[String(key)] = value
  })
  return entries
}

export async function buildLocalBackupPayload(): Promise<OutflowLocalBackupFile> {
  const entries = await collectLocalforageEntries()
  return {
    outflowBackupFormat: OUTFLOW_BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    entries,
  }
}

export function triggerJsonDownload(
  payload: unknown,
  filename: string,
): void {
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export type BackupParseResult =
  | { ok: true; entries: Record<string, unknown> }
  | { ok: false; message: string }

function isPlainRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/**
 * 解析备份文件：支持本应用封装格式，或裸 PersistedState v2（整文件即工作区）。
 */
export function parseBackupFileJson(parsed: unknown): BackupParseResult {
  if (!isPlainRecord(parsed)) {
    return { ok: false, message: '文件内容不是 JSON 对象。' }
  }

  if (
    parsed.outflowBackupFormat === OUTFLOW_BACKUP_FORMAT &&
    isPlainRecord(parsed.entries)
  ) {
    const raw = parsed.entries[STORAGE_KEY]
    if (tryParsePersistedState(raw) === null) {
      return {
        ok: false,
        message: `备份中缺少有效的「${STORAGE_KEY}」工作区数据，或结构损坏。`,
      }
    }
    return { ok: true, entries: parsed.entries }
  }

  if (tryParsePersistedState(parsed) !== null) {
    return { ok: true, entries: { [STORAGE_KEY]: parsed } }
  }

  return {
    ok: false,
    message:
      '无法识别备份格式：需包含 version 为 2 的 projects、chats、blocks 数组，或使用本应用导出的备份文件。',
  }
}

/** 清空 IndexedDB 中的 OutFlow store 并写入条目（用于导入后 reload） */
export async function clearAndRestoreLocalforage(
  entries: Record<string, unknown>,
): Promise<void> {
  await localforage.clear()
  for (const [key, value] of Object.entries(entries)) {
    await localforage.setItem(key, value)
  }
}
