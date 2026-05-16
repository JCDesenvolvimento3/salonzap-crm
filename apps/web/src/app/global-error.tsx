'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureClientException } from '@/lib/analytics'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureClientException(error, {
      next: {
        digest: error.digest ?? 'unknown',
      },
    })
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[var(--background-app)] text-white">
        <main className="flex min-h-screen items-center justify-center px-5 py-10">
          <div className="max-w-xl rounded-[32px] border border-[var(--border-subtle)] bg-[var(--background-raised)] p-8 text-center shadow-[var(--shadow-soft)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-rose-400/20 bg-rose-400/12 text-rose-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold text-white">Algo saiu do fluxo esperado</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Registramos o erro para diagnostico e observabilidade. Tente recarregar a experiencia para continuar.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={reset}>Tentar novamente</Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
