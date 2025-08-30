import { useAuth0 } from '@auth0/auth0-react'

export const useAuth = () => {
  const { loginWithPopup, loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0()

  return {
    loginWithPopup,
    loginWithRedirect,
    logout,
    user,
    isAuthenticated,
    isLoading,
  }
}

export default useAuth
