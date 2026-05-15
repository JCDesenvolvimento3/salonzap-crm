'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'default' | 'success' | 'warning' | 'danger'

type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
  duration?: number
}

type ToastItem = ToastInput & {
  id: string
}

type ToastContextValue = {
  pushToast: (input: ToastInput) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function iconForTone(tone: ToastTone) {
  if (tone === 'success') {
    return <CheckCircle2 className="h-4 w-4" />
  }

  if (tone === 'warning') {
    return <TriangleAlert className="h-4 w-4" />
  }

  if (tone === 'danger') {
    return <XCircle className="h-4 w-4" />
  }

  return <Info className="h-4 w-4" />
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    ({ duration = 3600, tone = 'default', ...toast }: ToastInput) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`

      setToasts((current) => [...current, { id, tone, duration, ...toast }])

      window.setTimeout(() => {
        dismissToast(id)
      }, duration)
    },
    [dismissToast],
  )

  const value = useMemo(
    () => ({
      pushToast,
      dismissToast,
    }),
    [dismissToast, pushToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'page-enter pointer-events-auto overflow-hidden rounded-[22px] border p-4 shadow-[var(--shadow-card)] backdrop-blur-2xl',
              toast.tone === 'default' && 'border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-white',
              toast.tone === 'success' && 'border-emerald-300/16 bg-emerald-300/12 text-emerald-50',
              toast.tone === 'warning' && 'border-amber-200/16 bg-amber-200/12 text-amber-50',
              toast.tone === 'danger' && 'border-rose-300/16 bg-rose-300/12 text-rose-50',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border',
                  toast.tone === 'default' && 'border-white/8 bg-white/6 text-[var(--accent)]',
                  toast.tone === 'success' && 'border-emerald-200/14 bg-emerald-50/10 text-emerald-50',
                  toast.tone === 'warning' && 'border-amber-200/14 bg-amber-50/10 text-amber-50',
                  toast.tone === 'danger' && 'border-rose-200/14 bg-rose-50/10 text-rose-50',
                )}
              >
                {iconForTone(toast.tone ?? 'default')}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm leading-6 text-current/80">{toast.description}</p> : null}
              </div>

              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/6 text-current/80 hover:bg-white/10"
                onClick={() => dismissToast(toast.id)}
                aria-label="Fechar notificacao"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return context
}
