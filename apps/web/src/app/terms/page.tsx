import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SUPPORT_EMAIL } from '@/lib/env'

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--accent)]">
        <ArrowLeft className="h-4 w-4" />
        Voltar para a home
      </Link>

      <Card className="mt-6 p-8 md:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">SalonZap CRM</p>
            <h1 className="text-3xl font-semibold text-white">Termos de uso</h1>
          </div>
        </div>

        <div className="mt-8 space-y-6 text-sm leading-8 text-[var(--text-secondary)]">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Uso autorizado</h2>
            <p>
              O acesso ao SalonZap e restrito a contas autorizadas pelo operador da instancia. O uso do produto deve
              respeitar a legislacao aplicavel, as regras de privacidade e as politicas internas do salao.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Dados e responsabilidade</h2>
            <p>
              O operador da conta e responsavel pela legitimidade dos dados cadastrados, pelos contatos abordados no
              WhatsApp e pelo uso adequado das campanhas, mensagens e automacoes habilitadas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Recursos de IA</h2>
            <p>
              As respostas e campanhas geradas por IA sao assistivas. O usuario continua responsavel pela revisao final
              antes do envio ao cliente e pela conformidade comercial da mensagem.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Disponibilidade e evolucao</h2>
            <p>
              O produto pode ser atualizado para melhorar seguranca, estabilidade e experiencia operacional. Mudancas
              que dependam de terceiros, como provedores de hospedagem, banco ou IA, podem exigir reconfiguracao de ambiente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Suporte</h2>
            <p>
              Dificuldades operacionais, solicitacoes comerciais e duvidas contratuais podem ser encaminhadas para{' '}
              <a className="text-[var(--accent)] underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>.
            </p>
          </section>
        </div>
      </Card>
    </main>
  )
}
