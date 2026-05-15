'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeName = 'obsidian' | 'graphite'

type ThemeContextValue = {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = 'salonzap.theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') {
      return 'obsidian'
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'graphite' || stored === 'obsidian' ? stored : 'obsidian'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((current) => (current === 'obsidian' ? 'graphite' : 'obsidian')),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }

  return context
}
