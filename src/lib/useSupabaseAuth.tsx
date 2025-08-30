import { useEffect, useState } from 'react'
import supabase from '@/helper/supabaseClient'

export function useSupabaseAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = supabase.auth.getSession?.()
    session?.then(res => {
      setUser(res?.data?.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  const signInWithEmail = (email: string) => supabase.auth.signInWithOtp({ email })
  const signUp = (email: string, password: string, data?: Record<string, any>) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data,
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })
  const signInWithPassword = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  return { user, loading, signInWithEmail, signUp, signInWithPassword, signOut }
}

export default useSupabaseAuth
