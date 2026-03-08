import { useState, useEffect } from 'react'
import { authAPI, getAccessToken, fetchWithAuth } from '../api/auth'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (token) {
      setIsAuthenticated(true)
    }
    setIsLoading(false)

    const handleLogout = () => {
      setIsAuthenticated(false)
    }
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      await authAPI.login(username, password)
      setIsAuthenticated(true)
      return true
    } catch (error) {
      console.error('[Auth] Login failed:', error)
      return false
    }
  }

  const logout = async (): Promise<void> => {
    await authAPI.logout()
    setIsAuthenticated(false)
  }

  return { isAuthenticated, login, logout, isLoading }
}

export { fetchWithAuth }
