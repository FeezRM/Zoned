import { useEffect, useState, useCallback } from 'react'
import useSupabaseAuth from '@/lib/useSupabaseAuth'
import { getProfile, upsertProfile } from '@/lib/profiles'
import type { Profile } from '@/types/profile'

export default function useProfile() {
  const { user, loading: authLoading } = useSupabaseAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await getProfile(user.id)
    if (!data) {
      // Create a minimal profile row so onboarding can update it
      const { data: created, error: upsertErr } = await upsertProfile({ id: user.id, onboarding_completed: false })
      if (upsertErr) {
        setError(upsertErr.message)
      }
      setProfile((created as any) ?? null)
    } else {
      setProfile(data as any)
    }
    if (error) setError(error.message)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      load()
    }
  }, [authLoading, load])

  return { profile, loading: authLoading || loading, error, refresh: load }
}
