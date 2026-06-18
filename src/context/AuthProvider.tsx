import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from './auth-context'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)

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
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
    if (error) throw error
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
    if (error) throw error
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
    if (error) throw error
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
      sendEmailOtp,
      verifyEmailOtp,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [
      configured,
      loading,
      user,
      session,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
