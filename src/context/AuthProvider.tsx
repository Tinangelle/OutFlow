import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from './auth-context'
import { getAppBaseUrl } from '../lib/appUrl'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

function formatAuthError(err: unknown): string {
  if (!(err instanceof Error)) return '操作失败。'
  const msg = err.message.toLowerCase()
  if (
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already exists')
  ) {
    return '该邮箱已存在（可能之前用过邮件链接登录，从未设置密码）。请改用下方「通过验证码设置密码」。'
  }
  if (msg.includes('invalid login credentials')) {
    return '邮箱或密码错误。若从未设置过密码，请用「通过验证码设置密码」。'
  }
  return err.message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!configured) return

    const supabase = getSupabase()
    let cancelled = false

    void (async () => {
      const { data, error } = await supabase.auth.getSession()
      if (cancelled) return
      if (error) {
        console.error('Supabase getSession failed:', error)
      }
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [configured])

  const sendEmailOtp = useCallback(async (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) {
      throw new Error('请输入邮箱地址。')
    }

    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
      },
    })
    if (error) throw error
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      throw new Error('请输入邮箱地址。')
    }
    if (!password) {
      throw new Error('请输入密码。')
    }

    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })
    if (error) throw new Error(formatAuthError(error))
  }, [])

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      throw new Error('请输入邮箱地址。')
    }
    if (password.length < 6) {
      throw new Error('密码至少 6 位。')
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    })
    if (error) throw new Error(formatAuthError(error))
    if (!data.session) {
      throw new Error(
        '账号已创建，但需在邮箱中确认后才能登录。手机 App 建议改用「验证码登录」，或在 Supabase 控制台关闭 Confirm email 后使用密码注册。',
      )
    }
  }, [])

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const trimmedEmail = email.trim()
    const trimmedToken = token.trim()
    if (!trimmedEmail) {
      throw new Error('请输入邮箱地址。')
    }
    if (!trimmedToken) {
      throw new Error('请输入邮件中的 6 位验证码。')
    }

    const supabase = getSupabase()
    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'email',
    })
    if (!error) return

    const { error: signupError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'signup',
    })
    if (signupError) throw new Error(formatAuthError(error))
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      throw new Error('请输入邮箱地址。')
    }

    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: getAppBaseUrl(),
    })
    if (error) throw new Error(formatAuthError(error))
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (password.length < 6) {
      throw new Error('密码至少 6 位。')
    }

    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(formatAuthError(error))
    setPasswordRecovery(false)
  }, [])

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false)
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      session,
      passwordRecovery,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithPassword,
      signUpWithPassword,
      requestPasswordReset,
      updatePassword,
      clearPasswordRecovery,
      signOut,
    }),
    [
      configured,
      loading,
      user,
      session,
      passwordRecovery,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithPassword,
      signUpWithPassword,
      requestPasswordReset,
      updatePassword,
      clearPasswordRecovery,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
