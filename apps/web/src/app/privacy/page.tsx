import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SUPPORT_EMAIL } from '@/lib/env'

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--accent)]">
        <ArrowLeft className="h-4 w-4" />
        Voltar para a home
      </Link>

      <Card className="mt-6 p-8 md:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">SalonZap CRM</p>
            <h1 className="text-3xl font-semibold text-white">Politica de privacidade</h1>
          </div>
        </div>

        <div className="mt-8 space-y-6 text-sm leading-8 text-[var(--text-secondary)]">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Dados tratados</h2>
            <p>
              O SalonZap trata dados operacionais informados pelo salao, como contatos, notas comerciais, campanhas,
              respostas rapidas, lembretes e dados de autenticacao dos usuarios autorizados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Finalidade</h2>
            <p>
              Os dados sao usados para operacao do CRM, acompanhamento comercial, organizacao do funil, automacao de
              follow-up e geracao de respostas assistidas por IA quando habilitada pela conta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Infraestrutura e subprocessadores</h2>
            <p>
              A operacao atual pode envolver provedores como Vercel para hospedagem, Supabase para banco de dados e
              OpenRouter para processamento de recursos de IA, conforme a configuracao ativa da conta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Seguranca e acesso</h2>
            <p>
              O acesso deve ser restrito a usuarios autorizados pelo operador da conta. Tokens, senhas, chaves de IA e
              variaveis de ambiente precisam ser mantidos em ambientes seguros e rotacionados quando houver risco de exposicao.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Contato</h2>
            <p>
              Para solicitacoes sobre privacidade, exclusao de dados ou seguranca operacional, entre em contato por{' '}
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
