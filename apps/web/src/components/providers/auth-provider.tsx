'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { type AuthSession, createApiClient } from '@salonzap/sdk'
import { API_URL, SESSION_STORAGE_KEY } from '@/lib/env'

type AuthContextValue = {
  session: AuthSession | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  api: ReturnType<typeof createApiClient>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function saveSession(session: AuthSession | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const accessToken = session?.accessToken ?? null

  const logout = () => {
    setSession(null)
    saveSession(null)
  }

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: API_URL,
        getToken: () => accessToken,
        onUnauthorized: async () => {
          setSession(null)
          saveSession(null)
        },
      }),
    [accessToken],
  )

  useEffect(() => {
    const hydrateSession = async () => {
      const stored = window.localStorage.getItem(SESSION_STORAGE_KEY)

      if (!stored) {
        setLoading(false)
        return
      }

      try {
        const parsed = JSON.parse(stored) as AuthSession
        setSession(parsed)

        const profile = await createApiClient({
          baseUrl: API_URL,
          getToken: () => parsed.accessToken,
        }).me()

        const refreshed = {
          ...profile,
          accessToken: parsed.accessToken,
        }

        setSession(refreshed)
        saveSession(refreshed)
      } catch {
        logout()
      } finally {
        setLoading(false)
      }
    }

    void hydrateSession()
  }, [])

  const login = async (email: string, password: string) => {
    const nextSession = await createApiClient({ baseUrl: API_URL }).login({ email, password })
    setSession(nextSession)
    saveSession(nextSession)
  }

  const refreshProfile = async () => {
    const currentAccessToken = accessToken
    if (!currentAccessToken) {
      return
    }

    const profile = await api.me()
    const refreshed = {
      ...profile,
      accessToken: currentAccessToken,
    }
    setSession(refreshed)
    saveSession(refreshed)
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, refreshProfile, api }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
