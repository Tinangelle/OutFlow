const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const DRIVE_FILE_NAME = 'outflow-sync.json'
const GOOGLE_API_BASE = 'https://www.googleapis.com/drive/v3/files'
const GOOGLE_UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3/files'

type TokenResponse = {
  access_token: string
  expires_in?: number
  token_type?: string
  scope?: string
}

type TokenClient = {
  callback: ((resp: TokenResponse) => void) | null
  requestAccessToken: (opts?: { prompt?: string }) => void
}

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string
      scope: string
      callback: (resp: TokenResponse) => void
      error_callback?: () => void
    }) => TokenClient
  }
}

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts
    }
  }
}

let tokenClient: TokenClient | null = null
let accessToken: string | null = null
let cachedFileId: string | null = null
let scriptsReadyPromise: Promise<void> | null = null

function readClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('未配置 VITE_GOOGLE_CLIENT_ID，无法连接 Google Drive。')
  }
  return clientId
}

function waitForGoogleIdentity(blockMs = 8000): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()

  if (!scriptsReadyPromise) {
    scriptsReadyPromise = new Promise((resolve, reject) => {
      const started = Date.now()
      const timer = window.setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          window.clearInterval(timer)
          resolve()
          return
        }
        if (Date.now() - started > blockMs) {
          window.clearInterval(timer)
          reject(new Error('Google SDK 加载超时，请检查网络后重试。'))
        }
      }, 100)
    })
  }
  return scriptsReadyPromise
}

async function ensureTokenClient(): Promise<TokenClient> {
  if (tokenClient) return tokenClient
  await waitForGoogleIdentity()
  const clientId = readClientId()
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) {
    throw new Error('Google OAuth 服务不可用，请稍后重试。')
  }
  tokenClient = oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: () => {},
  })
  return tokenClient
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const text = await res.text()
      if (text) detail = `${detail}: ${text}`
    } catch {
      // ignore response parsing failure
    }
    throw new Error(`Google Drive 请求失败：${detail}`)
  }
  return (await res.json()) as T
}

function withAuthHeader(token: string, headers?: HeadersInit): Headers {
  const result = new Headers(headers)
  result.set('Authorization', `Bearer ${token}`)
  return result
}

async function resolveFileId(token: string): Promise<string | null> {
  if (cachedFileId) return cachedFileId
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`)
  const fields = encodeURIComponent('files(id,name)')
  const url = `${GOOGLE_API_BASE}?spaces=appDataFolder&q=${q}&fields=${fields}&pageSize=1`
  const data = await fetchJson<{ files?: Array<{ id: string }> }>(url, {
    headers: withAuthHeader(token),
  })
  const fileId = data.files?.[0]?.id ?? null
  cachedFileId = fileId
  return fileId
}

export async function authorizeGoogleDrive(): Promise<void> {
  const client = await ensureTokenClient()
  const token = await new Promise<string>((resolve, reject) => {
    client.callback = (resp) => {
      if (!resp.access_token) {
        reject(new Error('Google 授权未返回 Access Token。'))
        return
      }
      accessToken = resp.access_token
      resolve(resp.access_token)
    }
    try {
      client.requestAccessToken({ prompt: accessToken ? '' : 'consent' })
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Google 授权请求失败。'))
    }
  })
  await resolveFileId(token)
}

export function isGoogleDriveAuthorized(): boolean {
  return Boolean(accessToken)
}

function requireToken(): string {
  if (!accessToken) {
    throw new Error('尚未连接 Google Drive，请先完成授权。')
  }
  return accessToken
}

export async function uploadBackupToGoogleDrive(jsonPayload: string): Promise<void> {
  const token = requireToken()
  const fileId = await resolveFileId(token)

  if (!fileId) {
    const metadata = {
      name: DRIVE_FILE_NAME,
      parents: ['appDataFolder'],
    }
    const form = new FormData()
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
    )
    form.append(
      'file',
      new Blob([jsonPayload], { type: 'application/json;charset=utf-8' }),
    )
    const created = await fetchJson<{ id: string }>(
      `${GOOGLE_UPLOAD_API_BASE}?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: withAuthHeader(token),
        body: form,
      },
    )
    cachedFileId = created.id
    return
  }

  await fetchJson<unknown>(
    `${GOOGLE_UPLOAD_API_BASE}/${encodeURIComponent(fileId)}?uploadType=media`,
    {
      method: 'PATCH',
      headers: withAuthHeader(token, {
        'Content-Type': 'application/json;charset=utf-8',
      }),
      body: jsonPayload,
    },
  )
}

export async function downloadBackupFromGoogleDrive(): Promise<string> {
  const token = requireToken()
  const fileId = await resolveFileId(token)
  if (!fileId) {
    throw new Error('云端尚无备份文件，请先执行一次覆盖到云端。')
  }
  const res = await fetch(
    `${GOOGLE_API_BASE}/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: withAuthHeader(token),
    },
  )
  if (!res.ok) {
    throw new Error(`下载云端备份失败：${res.status} ${res.statusText}`)
  }
  return await res.text()
}
