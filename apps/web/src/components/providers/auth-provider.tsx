'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { type AuthSession, createApiClient } from '@salonzap/sdk'
import { captureAnalyticsEvent, identifyAnalyticsUser, resetAnalyticsUser } from '@/lib/analytics'
import { API_URL, LOGOUT_REASON_STORAGE_KEY, SESSION_STORAGE_KEY } from '@/lib/env'

type AuthContextValue = {
  session: AuthSession | null
  loading: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  googleLogin: (payload: { code: string; redirectUri: string; salonName?: string }, remember?: boolean) => Promise<void>
  register: (payload: {
    salonName: string
    name: string
    email: string
    password: string
  }) => Promise<void>
  logout: (reason?: 'manual' | 'expired') => void
  refreshProfile: () => Promise<void>
  api: ReturnType<typeof createApiClient>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const SESSION_PERSISTENCE_KEY = `${SESSION_STORAGE_KEY}:mode`

function clearStoredSessions() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY)
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  window.localStorage.removeItem(SESSION_PERSISTENCE_KEY)
}

function saveSession(session: AuthSession | null, remember = true) {
  if (typeof window === 'undefined') {
    return
  }

  if (!session) {
    clearStoredSessions()
    return
  }

  clearStoredSessions()

  const serialized = JSON.stringify(session)

  if (remember) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, serialized)
    window.localStorage.setItem(SESSION_PERSISTENCE_KEY, 'local')
    return
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, serialized)
  window.localStorage.setItem(SESSION_PERSISTENCE_KEY, 'session')
}

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null
  }

  const mode = window.localStorage.getItem(SESSION_PERSISTENCE_KEY)

  if (mode === 'session') {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  }

  return (
    window.localStorage.getItem(SESSION_STORAGE_KEY) ??
    window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  )
}

function finalizeSession(nextSession: AuthSession, remember = true) {
  saveSession(nextSession, remember)

  try {
    identifyAnalyticsUser(nextSession)
  } catch (error) {
    console.error('Analytics identify failed.', error)
  }
}

function safeCapture(event: string, properties?: Record<string, unknown>) {
  try {
    captureAnalyticsEvent(event, properties)
  } catch (error) {
    console.error('Analytics capture failed.', error)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const accessToken = session?.accessToken ?? null

  const logout = (reason: 'manual' | 'expired' = 'manual') => {
    setSession(null)
    saveSession(null)
    resetAnalyticsUser()
    if (typeof window !== 'undefined') {
      if (reason === 'expired') {
        window.sessionStorage.setItem(LOGOUT_REASON_STORAGE_KEY, reason)
      } else {
        window.sessionStorage.removeItem(LOGOUT_REASON_STORAGE_KEY)
      }
    }
    if (reason === 'manual') {
      captureAnalyticsEvent('workspace_logout')
    }
  }

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: API_URL,
        getToken: () => accessToken,
        onUnauthorized: async () => {
          logout('expired')
        },
      }),
    [accessToken],
  )

  useEffect(() => {
      const hydrateSession = async () => {
      const stored = readStoredSession()

      if (!stored) {
        setLoading(false)
        return
      }

      try {
        const parsed = JSON.parse(stored) as AuthSession
        setSession(parsed)
        identifyAnalyticsUser(parsed)

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
        identifyAnalyticsUser(refreshed)
      } catch {
        logout()
      } finally {
        setLoading(false)
      }
    }

    void hydrateSession()
  }, [])

  const login = async (email: string, password: string, remember = true) => {
    const nextSession = await createApiClient({ baseUrl: API_URL }).login({ email, password })
    setSession(nextSession)
    finalizeSession(nextSession, remember)
    safeCapture('workspace_login', {
      salonId: nextSession.user.salonId,
      role: nextSession.user.role,
    })
  }

  const googleLogin = async (
    payload: { code: string; redirectUri: string; salonName?: string },
    remember = true,
  ) => {
    const nextSession = await createApiClient({ baseUrl: API_URL }).googleAuth(payload)
    setSession(nextSession)
    finalizeSession(nextSession, remember)
    safeCapture('workspace_google_login', {
      salonId: nextSession.user.salonId,
      salonSlug: nextSession.salon.slug,
      role: nextSession.user.role,
    })
  }

  const register = async (payload: {
    salonName: string
    name: string
    email: string
    password: string
  }) => {
    const nextSession = await createApiClient({ baseUrl: API_URL }).register(payload)
    setSession(nextSession)
    finalizeSession(nextSession)
    safeCapture('workspace_signup', {
      salonId: nextSession.user.salonId,
      salonSlug: nextSession.salon.slug,
      role: nextSession.user.role,
    })
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
    identifyAnalyticsUser(refreshed)
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, googleLogin, register, logout, refreshProfile, api }}>
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
