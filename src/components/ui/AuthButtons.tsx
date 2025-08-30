import React from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from '@/components/ui/button'

export const LoginButton: React.FC = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0()
  if (isAuthenticated) return null
  return (
    <Button onClick={() => loginWithRedirect()} variant="ghost" size="sm">
      Sign in
    </Button>
  )
}

export const LogoutButton: React.FC = () => {
  const { logout, isAuthenticated } = useAuth0()
  if (!isAuthenticated) return null
  return (
    <Button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} variant="ghost" size="sm">
      Sign out
    </Button>
  )
}

export default LoginButton
