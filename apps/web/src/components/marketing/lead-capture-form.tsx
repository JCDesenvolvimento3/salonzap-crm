'use client'

import { useState } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { captureAnalyticsEvent } from '@/lib/analytics'
import { SALES_EMAIL } from '@/lib/env'

function buildMailtoUrl(payload: {
  name: string
  salon: string
  email: string
  phone: string
  challenge: string
}) {
  const subject = encodeURIComponent(`Novo lead SalonZap - ${payload.salon || payload.name}`)
  const body = encodeURIComponent(
    [
      `Nome: ${payload.name}`,
      `Salao: ${payload.salon}`,
      `Email: ${payload.email}`,
      `Telefone: ${payload.phone || 'Nao informado'}`,
      '',
      'Desafio atual:',
      payload.challenge || 'Nao informado',
    ].join('\n'),
  )

  return `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`
}

export function LeadCaptureForm() {
  const [form, setForm] = useState({
    name: '',
    salon: '',
    email: '',
    phone: '',
    challenge: '',
  })

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    captureAnalyticsEvent('marketing_lead_requested', {
      salon: form.salon || undefined,
      email: form.email,
    })

    window.location.href = buildMailtoUrl(form)
  }

  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
          <Mail className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Solicitar proposta</p>
          <h3 className="text-2xl font-semibold text-white">Comece com 1 a 3 saloes em operacao real</h3>
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Seu nome">
            <Input value={form.name} onChange={(event) => handleChange('name', event.target.value)} required />
          </Field>
          <Field label="Salao ou operacao">
            <Input value={form.salon} onChange={(event) => handleChange('salon', event.target.value)} required />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              required
            />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} />
          </Field>
        </div>

        <Field label="Desafio mais urgente">
          <Textarea
            value={form.challenge}
            onChange={(event) => handleChange('challenge', event.target.value)}
            className="min-h-[130px]"
            placeholder="Ex.: recuperar clientes sumidos, organizar follow-up no WhatsApp ou padronizar campanhas."
          />
        </Field>

        <Button type="submit" size="lg" className="w-full md:w-auto">
          Receber proposta
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        O formulario abre seu cliente de e-mail com os dados preenchidos para iniciar o piloto comercial com informacoes reais da sua operacao.
      </p>
    </Card>
  )
}
