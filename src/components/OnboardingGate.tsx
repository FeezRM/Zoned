import React, { PropsWithChildren, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSupabaseAuth from '@/lib/useSupabaseAuth'
import useProfile from '@/lib/useProfile'

const OnboardingGate: React.FC<PropsWithChildren> = ({ children }) => {
  const { user, loading: authLoading } = useSupabaseAuth()
  const { profile, loading: profileLoading } = useProfile()
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading || profileLoading) return
    if (user && !profile?.onboarding_completed) {
      navigate('/onboarding', { replace: true })
    }
  }, [authLoading, profileLoading, user, profile?.onboarding_completed, navigate])

  if (authLoading || profileLoading) return null
  if (user && !profile?.onboarding_completed) return null
  return <>{children}</>
}

export default OnboardingGate
