import {
  CloudDownload,
  CloudUpload,
  Download,
  Link2,
  LogOut,
  Mail,
  Upload,
  X,
} from 'lucide-react'
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
import {
  fetchCloudWorkspace,
  uploadLocalWorkspaceToCloud,
} from '../lib/cloudSync'
import { isStandalonePwa } from '../lib/appUrl'
import { STORAGE_KEY } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { useOutflow } from '../hooks/useOutflow'
import type { CloudSyncStatus } from '../context/outflow-context'

function cloudSyncStatusLabel(status: CloudSyncStatus): string {
  switch (status) {
    case 'disabled':
      return '未启用（未登录）'
    case 'pending':
      return '等待同步…'
    case 'syncing':
      return '同步中…'
    case 'synced':
      return '已同步'
    case 'error':
      return '同步失败'
  }
}

const IMPORT_CONFIRM =
  '导入将彻底覆盖当前所有数据。确定要继续吗？'
const CLOUD_RESTORE_CONFIRM =
  '从云端恢复会覆盖当前本地所有数据并立即刷新页面。确定继续吗？'
const SUPABASE_RESTORE_CONFIRM =
  '从 Supabase 云端恢复会覆盖当前本地所有数据并立即刷新页面。确定继续吗？'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const {
    configured: supabaseConfigured,
    loading: authLoading,
    user,
    passwordRecovery,
    sendEmailOtp,
    verifyEmailOtp,
    signInWithPassword,
    signUpWithPassword,
    requestPasswordReset,
    updatePassword,
    clearPasswordRecovery,
    signOut,
  } = useAuth()
  const { cloudSyncStatus, cloudSyncError } = useOutflow()
  const fileRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [connectingDrive, setConnectingDrive] = useState(false)
  const [cloudUploading, setCloudUploading] = useState(false)
  const [cloudRestoring, setCloudRestoring] = useState(false)
  const [driveConnected, setDriveConnected] = useState(isGoogleDriveAuthorized())
  const [loginEmail, setLoginEmail] = useState('')
  const [loginOtp, setLoginOtp] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginPasswordConfirm, setLoginPasswordConfirm] = useState('')
  const [loginMode, setLoginMode] = useState<'otp' | 'password'>(() =>
    isStandalonePwa() ? 'password' : 'otp',
  )
  const [passwordMode, setPasswordMode] = useState<
    'signin' | 'signup' | 'set-via-otp'
  >('signin')
  const [setPasswordPhase, setSetPasswordPhase] = useState<'otp' | 'new-password'>(
    'otp',
  )
  const [showOtpSetupHelp, setShowOtpSetupHelp] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [requestingReset, setRequestingReset] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const standalonePwa = isStandalonePwa()
  const [signingOut, setSigningOut] = useState(false)
  const [supabaseUploading, setSupabaseUploading] = useState(false)
  const [supabaseRestoring, setSupabaseRestoring] = useState(false)

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

  const handleSendOtp = useCallback(async () => {
    setSendingOtp(true)
    try {
      await sendEmailOtp(loginEmail)
      setOtpSent(true)
      setLoginOtp('')
      window.alert(
        '验证码已发送。若邮件里只有链接、没有 6 位数字，需要在 Supabase 控制台修改邮件模板（见下方说明）。收到验证码后在本页输入，不要点邮件链接。',
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : '发送验证码失败。'
      window.alert(message)
    } finally {
      setSendingOtp(false)
    }
  }, [loginEmail, sendEmailOtp])

  const handleVerifyOtp = useCallback(async () => {
    setVerifyingOtp(true)
    try {
      await verifyEmailOtp(loginEmail, loginOtp)
      setOtpSent(false)
      setLoginOtp('')
    } catch (err) {
      const message = err instanceof Error ? err.message : '验证码错误或已过期。'
      window.alert(message)
    } finally {
      setVerifyingOtp(false)
    }
  }, [loginEmail, loginOtp, verifyEmailOtp])

  const handlePasswordAuth = useCallback(async () => {
    setPasswordSubmitting(true)
    try {
      if (passwordMode === 'signup') {
        if (loginPassword !== loginPasswordConfirm) {
          throw new Error('两次输入的密码不一致。')
        }
        await signUpWithPassword(loginEmail, loginPassword)
        window.alert('注册成功，已登录。')
      } else if (passwordMode === 'signin') {
        await signInWithPassword(loginEmail, loginPassword)
      }
      setLoginPassword('')
      setLoginPasswordConfirm('')
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败。'
      window.alert(message)
    } finally {
      setPasswordSubmitting(false)
    }
  }, [
    loginEmail,
    loginPassword,
    loginPasswordConfirm,
    passwordMode,
    signInWithPassword,
    signUpWithPassword,
  ])

  const handleSendOtpForSetPassword = useCallback(async () => {
    setSendingOtp(true)
    try {
      await sendEmailOtp(loginEmail)
      setOtpSent(true)
      setLoginOtp('')
      setSetPasswordPhase('otp')
      window.alert(
        '验证码已发送。验证通过后可设置新密码。若邮件只有链接没有数字，需先在 Supabase 配置邮件模板。',
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : '发送验证码失败。'
      window.alert(message)
    } finally {
      setSendingOtp(false)
    }
  }, [loginEmail, sendEmailOtp])

  const handleVerifyOtpForSetPassword = useCallback(async () => {
    setVerifyingOtp(true)
    try {
      await verifyEmailOtp(loginEmail, loginOtp)
      setSetPasswordPhase('new-password')
      setLoginOtp('')
      setOtpSent(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : '验证码错误或已过期。'
      window.alert(message)
    } finally {
      setVerifyingOtp(false)
    }
  }, [loginEmail, loginOtp, verifyEmailOtp])

  const handleSaveNewPassword = useCallback(async () => {
    if (newPassword !== newPasswordConfirm) {
      window.alert('两次输入的密码不一致。')
      return
    }
    setUpdatingPassword(true)
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setNewPasswordConfirm('')
      setSetPasswordPhase('otp')
      setPasswordMode('signin')
      clearPasswordRecovery()
      window.alert('密码已设置，下次可用邮箱和密码登录。')
    } catch (err) {
      const message = err instanceof Error ? err.message : '设置密码失败。'
      window.alert(message)
    } finally {
      setUpdatingPassword(false)
    }
  }, [newPassword, newPasswordConfirm, updatePassword, clearPasswordRecovery])

  const handleRequestPasswordReset = useCallback(async () => {
    if (!loginEmail.trim()) {
      window.alert('请先输入邮箱地址。')
      return
    }
    setRequestingReset(true)
    try {
      await requestPasswordReset(loginEmail)
      window.alert(
        '重置邮件已发送。请在电脑浏览器中打开邮件链接设置新密码，然后在 App 用新密码登录（不要指望在主屏幕 App 里点链接）。',
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : '发送重置邮件失败。'
      window.alert(message)
    } finally {
      setRequestingReset(false)
    }
  }, [loginEmail, requestPasswordReset])

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      await signOut()
    } catch (err) {
      const message = err instanceof Error ? err.message : '退出登录失败。'
      window.alert(message)
    } finally {
      setSigningOut(false)
    }
  }, [signOut])

  const handleSupabaseUpload = useCallback(async () => {
    setSupabaseUploading(true)
    try {
      await uploadLocalWorkspaceToCloud()
      window.alert('已上传到 Supabase 云端。')
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传到 Supabase 失败。'
      window.alert(message)
    } finally {
      setSupabaseUploading(false)
    }
  }, [])

  const handleSupabaseRestore = useCallback(async () => {
    if (!window.confirm(SUPABASE_RESTORE_CONFIRM)) return
    setSupabaseRestoring(true)
    try {
      const remote = await fetchCloudWorkspace()
      if (!remote) {
        window.alert('云端尚无备份，请先执行一次上传到云端。')
        return
      }
      await clearAndRestoreLocalforage({
        [STORAGE_KEY]: remote.state,
      })
      window.location.reload()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '从 Supabase 云端恢复失败。'
      window.alert(message)
    } finally {
      setSupabaseRestoring(false)
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

        {supabaseConfigured ? (
          <section className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              账号与云端
            </h3>
            {authLoading ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                正在检查登录状态…
              </p>
            ) : user ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  已登录：{user.email ?? '（无邮箱）'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  自动同步：{cloudSyncStatusLabel(cloudSyncStatus)}
                  {cloudSyncError ? `（${cloudSyncError}）` : null}
                </p>
                {passwordRecovery ? (
                  <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 dark:border-amber-700/60 dark:bg-amber-950/30">
                    <p className="text-xs text-amber-950 dark:text-amber-100">
                      请设置新密码以完成重置。
                    </p>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="新密码（至少 6 位）"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <input
                      type="password"
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      placeholder="再次输入新密码"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      disabled={
                        updatingPassword ||
                        newPassword.length < 6 ||
                        newPasswordConfirm.length < 6
                      }
                      onClick={() => void handleSaveNewPassword()}
                      className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {updatingPassword ? '保存中…' : '保存新密码'}
                    </button>
                  </div>
                ) : (
                  <details className="rounded-xl border border-zinc-200/80 text-xs dark:border-zinc-700">
                    <summary className="cursor-pointer px-3 py-2 font-medium text-zinc-700 dark:text-zinc-200">
                      修改密码
                    </summary>
                    <div className="space-y-2 border-t border-zinc-200/80 px-3 py-2 dark:border-zinc-700">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="新密码（至少 6 位）"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="再次输入新密码"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        disabled={
                          updatingPassword ||
                          newPassword.length < 6 ||
                          newPasswordConfirm.length < 6
                        }
                        onClick={() => void handleSaveNewPassword()}
                        className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-sm font-medium text-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        {updatingPassword ? '保存中…' : '更新密码'}
                      </button>
                    </div>
                  </details>
                )}
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={() => void handleSignOut()}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? '退出中…' : '退出登录'}
                </button>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={supabaseUploading || supabaseRestoring}
                    onClick={() => void handleSupabaseUpload()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <CloudUpload className="h-3.5 w-3.5" />
                    {supabaseUploading ? '上传中…' : '上传到云端'}
                  </button>
                  <button
                    type="button"
                    disabled={supabaseRestoring || supabaseUploading}
                    onClick={() => void handleSupabaseRestore()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-100"
                  >
                    <CloudDownload className="h-3.5 w-3.5" />
                    {supabaseRestoring ? '恢复中…' : '从云端恢复'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <button
                    type="button"
                    onClick={() => setLoginMode('otp')}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                      loginMode === 'otp'
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    验证码登录
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode('password')}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                      loginMode === 'password'
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    密码登录
                  </button>
                </div>

                {loginMode === 'otp' ? (
                  <>
                    <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
                      {standalonePwa
                        ? '主屏幕 App 与浏览器不共享登录状态。请在本页输入邮件里的 6 位验证码，不要点邮件链接。'
                        : '推荐验证码登录：在本页输入邮件里的 6 位数字即可，无需点击邮件链接。'}
                    </p>
                    <label className="block">
                      <span className="sr-only">邮箱</span>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="your@email.com"
                        autoComplete="email"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-0 transition placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={sendingOtp || !loginEmail.trim()}
                      onClick={() => void handleSendOtp()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      {sendingOtp ? '发送中…' : otpSent ? '重新发送验证码' : '发送验证码'}
                    </button>
                    <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          邮件中的 6 位验证码
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={loginOtp}
                          onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, '').slice(0, 6)
                            setLoginOtp(next)
                            if (next.length === 6 && !verifyingOtp) {
                              void (async () => {
                                setVerifyingOtp(true)
                                try {
                                  await verifyEmailOtp(loginEmail, next)
                                  setOtpSent(false)
                                  setLoginOtp('')
                                } catch (err) {
                                  const message =
                                    err instanceof Error
                                      ? err.message
                                      : '验证码错误或已过期。'
                                  window.alert(message)
                                } finally {
                                  setVerifyingOtp(false)
                                }
                              })()
                            }
                          }}
                          placeholder="123456"
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-center text-lg tracking-[0.3em] text-zinc-900 outline-none transition placeholder:tracking-normal placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={verifyingOtp || loginOtp.length < 6}
                        onClick={() => void handleVerifyOtp()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      >
                        {verifyingOtp ? '验证中…' : '验证并登录'}
                      </button>
                    </div>
                    <details
                      className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 text-xs dark:border-zinc-700 dark:bg-zinc-800/40"
                      open={showOtpSetupHelp}
                      onToggle={(e) =>
                        setShowOtpSetupHelp((e.currentTarget as HTMLDetailsElement).open)
                      }
                    >
                      <summary className="cursor-pointer px-3 py-2 font-medium text-zinc-700 dark:text-zinc-200">
                        只收到链接、没有验证码？
                      </summary>
                      <div className="space-y-2 border-t border-zinc-200/80 px-3 py-2 leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                        <p>
                          验证码由 Supabase 邮件模板决定，应用无法单独控制。请在
                          Supabase 控制台 → Authentication → Email Templates
                          中修改以下两个模板：
                        </p>
                        <ol className="list-decimal space-y-1 pl-4">
                          <li>
                            <strong>Magic Link</strong>（老用户登录用）
                          </li>
                          <li>
                            <strong>Confirm signup</strong>（首次注册用）
                          </li>
                        </ol>
                        <p>
                          把正文里的{' '}
                          <code className="rounded bg-zinc-200/80 px-1 dark:bg-zinc-700">
                            {'{{ .ConfirmationURL }}'}
                          </code>{' '}
                          换成{' '}
                          <code className="rounded bg-zinc-200/80 px-1 dark:bg-zinc-700">
                            {'{{ .Token }}'}
                          </code>
                          ，并删掉所有可点击链接。
                        </p>
                        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-2 text-[11px] leading-relaxed text-zinc-100">
{`<h2>OutFlow 登录验证码</h2>
<p>请在 App 内输入以下 6 位数字，不要点击链接：</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;">{{ .Token }}</p>`}
                        </pre>
                        <p>
                          保存后重新发送验证码。若暂时不想改模板，可切换到「密码登录」直接注册。
                        </p>
                      </div>
                    </details>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      使用邮箱和密码登录，无需打开邮件链接，适合手机主屏幕 App。
                    </p>
                    <p className="rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300">
                      若之前用过邮件链接登录，账号已存在但<strong>没有密码</strong>
                      。请选「通过验证码设置密码」，不要选「注册新账号」。
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordMode('signin')
                          setSetPasswordPhase('otp')
                        }}
                        className={`rounded-lg px-2 py-1 font-medium transition ${
                          passwordMode === 'signin'
                            ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                        }`}
                      >
                        已有账号
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordMode('signup')
                          setSetPasswordPhase('otp')
                        }}
                        className={`rounded-lg px-2 py-1 font-medium transition ${
                          passwordMode === 'signup'
                            ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                        }`}
                      >
                        注册新账号
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordMode('set-via-otp')
                          setSetPasswordPhase('otp')
                        }}
                        className={`rounded-lg px-2 py-1 font-medium transition ${
                          passwordMode === 'set-via-otp'
                            ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100'
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                        }`}
                      >
                        通过验证码设置密码
                      </button>
                    </div>

                    {passwordMode === 'set-via-otp' ? (
                      setPasswordPhase === 'otp' ? (
                        <div className="space-y-2">
                          <label className="block">
                            <span className="sr-only">邮箱</span>
                            <input
                              type="email"
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="your@email.com"
                              autoComplete="email"
                              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={sendingOtp || !loginEmail.trim()}
                            onClick={() => void handleSendOtpForSetPassword()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-medium text-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                          >
                            <Mail className="h-4 w-4 shrink-0" />
                            {sendingOtp ? '发送中…' : '发送验证码'}
                          </button>
                          {otpSent ? (
                            <>
                              <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={loginOtp}
                                onChange={(e) =>
                                  setLoginOtp(
                                    e.target.value.replace(/\D/g, '').slice(0, 6),
                                  )
                                }
                                placeholder="输入 6 位验证码"
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-center text-lg tracking-[0.3em] text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                              />
                              <button
                                type="button"
                                disabled={verifyingOtp || loginOtp.length < 6}
                                onClick={() => void handleVerifyOtpForSetPassword()}
                                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                              >
                                {verifyingOtp ? '验证中…' : '验证邮箱'}
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                          <p className="text-xs text-zinc-600 dark:text-zinc-300">
                            邮箱已验证，请设置新密码。
                          </p>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="新密码（至少 6 位）"
                            autoComplete="new-password"
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                          <input
                            type="password"
                            value={newPasswordConfirm}
                            onChange={(e) => setNewPasswordConfirm(e.target.value)}
                            placeholder="再次输入新密码"
                            autoComplete="new-password"
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                          <button
                            type="button"
                            disabled={
                              updatingPassword ||
                              newPassword.length < 6 ||
                              newPasswordConfirm.length < 6
                            }
                            onClick={() => void handleSaveNewPassword()}
                            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                          >
                            {updatingPassword ? '保存中…' : '保存密码并登录'}
                          </button>
                        </div>
                      )
                    ) : (
                      <>
                    <label className="block">
                      <span className="sr-only">邮箱</span>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="your@email.com"
                        autoComplete="email"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                      />
                    </label>
                    <label className="block">
                      <span className="sr-only">密码</span>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="密码（至少 6 位）"
                        autoComplete={
                          passwordMode === 'signup' ? 'new-password' : 'current-password'
                        }
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                      />
                    </label>
                    {passwordMode === 'signup' ? (
                      <label className="block">
                        <span className="sr-only">确认密码</span>
                        <input
                          type="password"
                          value={loginPasswordConfirm}
                          onChange={(e) => setLoginPasswordConfirm(e.target.value)}
                          placeholder="再次输入密码"
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                        />
                      </label>
                    ) : null}
                    <button
                      type="button"
                      disabled={
                        passwordSubmitting ||
                        !loginEmail.trim() ||
                        loginPassword.length < 6 ||
                        (passwordMode === 'signup' &&
                          loginPasswordConfirm.length < 6)
                      }
                      onClick={() => void handlePasswordAuth()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      {passwordSubmitting
                        ? '处理中…'
                        : passwordMode === 'signup'
                          ? '注册并登录'
                          : '登录'}
                    </button>
                    {passwordMode === 'signin' ? (
                      <button
                        type="button"
                        disabled={requestingReset || !loginEmail.trim()}
                        onClick={() => void handleRequestPasswordReset()}
                        className="w-full text-center text-xs text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        {requestingReset
                          ? '发送中…'
                          : '忘记密码？（在电脑浏览器打开邮件链接重置）'}
                      </button>
                    ) : null}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              账号与云端
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              未配置 Supabase。请在 .env 中设置 VITE_SUPABASE_URL 与
              VITE_SUPABASE_ANON_KEY。
            </p>
          </section>
        )}

        <section className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            本地备份
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            导出或导入本地 IndexedDB 中的全量工作区数据（项目、对话、内容块，含回收站中的条目）。
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleExport()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
