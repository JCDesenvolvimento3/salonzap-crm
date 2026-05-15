'use client'

import { X } from 'lucide-react'
import { Card } from './card'
import { Button } from './button'

type ModalProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Modal({ open, title, subtitle, onClose, children, footer }: ModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-lg">
      <Card variant="spotlight" className="page-enter max-h-[92vh] w-full max-w-3xl overflow-hidden">
        <div className="flex items-start justify-between border-b border-[var(--border-subtle)] px-6 py-5 md:px-7">
          <div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            {subtitle ? <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5 md:px-7">{children}</div>

        {footer ? <div className="border-t border-[var(--border-subtle)] px-6 py-4 md:px-7">{footer}</div> : null}
      </Card>
    </div>
  )
}
