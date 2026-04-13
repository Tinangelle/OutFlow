import { CloudDownload, CloudUpload, Download, Link2, Upload, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import {
  backupDownloadFilename,
  buildLocalBackupPayload,
  clearAndRestoreLocalforage,
  parseBackupFileJson,
  triggerJsonDownload,
} from '../lib/backup'
import {
  authorizeGoogleDrive,
  downloadBackupFromGoogleDrive,
  isGoogleDriveAuthorized,
  uploadBackupToGoogleDrive,
} from '../lib/googleDrive'

const IMPORT_CONFIRM =
  '导入将彻底覆盖当前所有数据。确定要继续吗？'
const CLOUD_RESTORE_CONFIRM =
  '从云端恢复会覆盖当前本地所有数据并立即刷新页面。确定继续吗？'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [connectingDrive, setConnectingDrive] = useState(false)
  const [cloudUploading, setCloudUploading] = useState(false)
  const [cloudRestoring, setCloudRestoring] = useState(false)
  const [driveConnected, setDriveConnected] = useState(isGoogleDriveAuthorized())

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const payload = await buildLocalBackupPayload()
      triggerJsonDownload(payload, backupDownloadFilename())
    } finally {
      setExporting(false)
    }
  }, [])

  const handlePickImport = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const handleFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return

      setImporting(true)
      try {
        let parsed: unknown
        try {
          const text = await file.text()
          parsed = JSON.parse(text) as unknown
        } catch {
          window.alert('无法读取或解析 JSON 文件。')
          return
        }

        const result = parseBackupFileJson(parsed)
        if (!result.ok) {
          window.alert(result.message)
          return
        }

        if (!window.confirm(IMPORT_CONFIRM)) return

        await clearAndRestoreLocalforage(result.entries)
        window.location.reload()
      } finally {
        setImporting(false)
      }
    },
    [],
  )

  const handleConnectDrive = useCallback(async () => {
    setConnectingDrive(true)
    try {
      await authorizeGoogleDrive()
      setDriveConnected(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : '连接 Google Drive 失败。'
      window.alert(message)
    } finally {
      setConnectingDrive(false)
    }
  }, [])

  const handleCloudUpload = useCallback(async () => {
    setCloudUploading(true)
    try {
      const payload = await buildLocalBackupPayload()
      await uploadBackupToGoogleDrive(JSON.stringify(payload))
      window.alert('已覆盖到 Google Drive 云端备份。')
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传云端失败。'
      window.alert(message)
    } finally {
      setCloudUploading(false)
    }
  }, [])

  const handleCloudRestore = useCallback(async () => {
    if (!window.confirm(CLOUD_RESTORE_CONFIRM)) return
    setCloudRestoring(true)
    try {
      const raw = await downloadBackupFromGoogleDrive()
      let parsed: unknown
      try {
        parsed = JSON.parse(raw) as unknown
      } catch {
        window.alert('云端备份文件不是合法 JSON，无法恢复。')
        return
      }
      const result = parseBackupFileJson(parsed)
      if (!result.ok) {
        window.alert(result.message)
        return
      }
      await clearAndRestoreLocalforage(result.entries)
      window.location.reload()
    } catch (err) {
      const message = err instanceof Error ? err.message : '从云端恢复失败。'
      window.alert(message)
    } finally {
      setCloudRestoring(false)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex select-none items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose()
      }}
      onPointerDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="max-h-[min(90dvh,32rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="settings-title"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            设置
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="关闭设置"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            备份与同步
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            导出或导入本地 IndexedDB 中的全量工作区数据（项目、对话、内容块，含回收站中的条目）。
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleExport()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-medium text-zinc-800 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:hover:border-violet-500 dark:hover:bg-violet-950/40 dark:hover:text-violet-100"
            >
              <Download className="h-4 w-4 shrink-0" />
              {exporting ? '正在导出…' : '导出本地备份'}
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={handlePickImport}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-800 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-950 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-100"
            >
              <Upload className="h-4 w-4 shrink-0" />
              {importing ? '正在处理…' : '导入本地备份'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-hidden
              onChange={(ev) => void handleFile(ev)}
            />
          </div>
          <div className="mt-4 space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                Google Drive: {driveConnected ? '已连接' : '未连接'}
              </p>
              {!driveConnected ? (
                <button
                  type="button"
                  disabled={connectingDrive}
                  onClick={() => void handleConnectDrive()}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-violet-500 dark:hover:bg-violet-950/40 dark:hover:text-violet-100"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {connectingDrive ? '连接中…' : '连接 Google Drive'}
                </button>
              ) : null}
            </div>
            {driveConnected ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={cloudUploading || cloudRestoring}
                  onClick={() => void handleCloudUpload()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-violet-500 dark:hover:bg-violet-950/40 dark:hover:text-violet-100"
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  {cloudUploading ? '上传中…' : '覆盖到云端'}
                </button>
                <button
                  type="button"
                  disabled={cloudRestoring || cloudUploading}
                  onClick={() => void handleCloudRestore()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-100"
                >
                  <CloudDownload className="h-3.5 w-3.5" />
                  {cloudRestoring ? '恢复中…' : '从云端恢复'}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
