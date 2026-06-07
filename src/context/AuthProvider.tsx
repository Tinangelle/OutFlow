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

  const signInWithEmail = useCallback(async (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) {
      throw new Error('请输入邮箱地址。')
    }

    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: getAppBaseUrl(),
        shouldCreateUser: true,
      },
    })
    if (error) throw error
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
      signInWithEmail,
      verifyEmailOtp,
      signOut,
    }),
    [configured, loading, user, session, signInWithEmail, verifyEmailOtp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
