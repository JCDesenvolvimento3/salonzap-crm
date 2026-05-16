'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Chrome, Download, ExternalLink, MessageSquareText, Puzzle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { EXTENSION_DOWNLOAD_PATH, WHATSAPP_WEB_URL } from '@/lib/env'

const STORAGE_KEY = 'salonzap:extension-install-dismissed'

const installSteps = [
  {
    icon: Download,
    title: 'Baixar a extensao',
    description: 'Baixe o pacote oficial do SalonZap para o Chrome diretamente pelo painel.',
  },
  {
    icon: Puzzle,
    title: 'Carregar no Chrome',
    description: 'No Chrome, abra Extensoes, ative o modo desenvolvedor e use "Carregar sem compactacao".',
  },
  {
    icon: MessageSquareText,
    title: 'Abrir o WhatsApp Web',
    description: 'Entre no web.whatsapp.com e use a mesma conta do painel para autenticar a sidebar.',
  },
]

export function ExtensionInstallModal() {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(STORAGE_KEY) !== '1'
  })

  const close = () => {
    setOpen(false)
    window.localStorage.setItem(STORAGE_KEY, '1')
  }

  const startSetup = () => {
    const link = document.createElement('a')
    link.href = EXTENSION_DOWNLOAD_PATH
    link.download = 'salonzap-extension.zip'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.open(WHATSAPP_WEB_URL, '_blank', 'noopener,noreferrer')
    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Instalar extensao e abrir o WhatsApp Web"
      subtitle="O SalonZap opera junto com o WhatsApp Web. Baixe a extensao, carregue no Chrome e abra a conversa para sincronizar contatos, notas, tags e IA."
      footer={
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Button variant="ghost" onClick={close}>
            Continuar no painel
          </Button>
          <div className="flex flex-col gap-3 md:flex-row">
            <Button onClick={startSetup}>
              Instalar e abrir WhatsApp
              <Chrome className="h-4 w-4" />
            </Button>
            <Button asChild variant="secondary">
              <Link href="/onboarding">
                Ver onboarding
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="surface">
              <a href={WHATSAPP_WEB_URL} target="_blank" rel="noreferrer" onClick={close}>
                Abrir WhatsApp Web
                <Chrome className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild>
              <a href={EXTENSION_DOWNLOAD_PATH} download onClick={close}>
                Baixar extensao
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {installSteps.map((step) => {
          const Icon = step.icon

          return (
            <div
              key={step.title}
              className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-white">{step.title}</h4>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.description}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-5 rounded-[24px] border border-emerald-400/12 bg-emerald-400/10 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-emerald-200" />
          <div>
            <p className="font-semibold text-white">Pronto para usuario final</p>
            <p className="mt-2 text-sm leading-7 text-emerald-50/90">
              Depois de instalada, a extensao passa a abrir a sidebar direto no WhatsApp Web e sincroniza o contato
              com o CRM real da sua operacao.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
