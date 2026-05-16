'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MoonStar,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { GOOGLE_CLIENT_ID, SUPPORT_EMAIL } from '@/lib/env'
import { requestGoogleAuthCode } from '@/lib/google-auth'

const setupHighlights = [
  {
    icon: Building2,
    title: 'Workspace pronto',
    text: 'Slug, identidade basica e estrutura inicial do CRM sao criados automaticamente.',
    tone: 'text-sky-400',
  },
  {
    icon: UserRound,
    title: 'Conta owner',
    text: 'O primeiro usuario ja entra com acesso total para operar painel e extensao.',
    tone: 'text-emerald-400',
  },
  {
    icon: LockKeyhole,
    title: 'Base produtiva',
    text: 'Etapas, tags e respostas rapidas basicas nascem junto com o workspace.',
    tone: 'text-violet-400',
  },
] as const

export default function SignupPage() {
  const router = useRouter()
  const { register, googleLogin, session, loading } = useAuth()
  const { toggleTheme } = useTheme()
  const { pushToast } = useToast()
  const [salonName, setSalonName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard')
    }
  }, [loading, router, session])

  const normalizeErrorMessage = (value: unknown) => {
    const message = value instanceof Error ? value.message : 'Nao foi possivel criar a conta.'

    if (message === 'BadRequest' || message === 'Bad Request') {
      return 'Nao foi possivel concluir o acesso no navegador. Atualize a pagina e tente novamente.'
    }

    return message
  }

  const goToDashboard = () => {
    window.location.assign('/dashboard')
  }

  const passwordMismatch = useMemo(() => {
    if (!confirmPassword.trim()) {
      return false
    }

    return password !== confirmPassword
  }, [confirmPassword, password])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (passwordMismatch) {
      setError('As senhas nao conferem.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await register({
        salonName,
        name,
        email,
        password,
      })

      pushToast({
        title: 'Workspace criado',
        description: 'Sua conta owner foi provisionada e o acesso ja esta ativo.',
        tone: 'success',
      })
      goToDashboard()
    } catch (submitError) {
      const message = normalizeErrorMessage(submitError)
      setError(message)
      pushToast({
        title: 'Falha no cadastro',
        description: message,
        tone: 'danger',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!GOOGLE_CLIENT_ID) {
      pushToast({
        title: 'Google nao configurado',
        description: 'Adicione as credenciais Google na configuracao de producao para liberar este acesso.',
        tone: 'warning',
      })
      return
    }

    setGoogleLoading(true)
    setError(null)

    try {
      const redirectUri = `${window.location.origin}/signup`
      const code = await requestGoogleAuthCode({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri,
      })

      await googleLogin(
        {
          code,
          redirectUri,
          salonName: salonName.trim() || undefined,
        },
        true,
      )
      goToDashboard()
    } catch (submitError) {
      const message = normalizeErrorMessage(submitError)
      setError(message)
      pushToast({
        title: 'Falha no Google',
        description: message,
        tone: 'danger',
      })
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col">
        <div className="grid flex-1 gap-6 xl:grid-cols-[1.52fr_1fr]">
          <Card variant="spotlight" className="overflow-hidden rounded-[34px] p-7 md:p-10">
            <div className="hero-grid pointer-events-none absolute inset-0 opacity-25" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(31,192,255,0.12),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(105,97,255,0.12),transparent_22%),linear-gradient(180deg,rgba(4,8,15,0.36),transparent_45%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <Badge tone="accent" className="px-4 py-2 text-[12px] tracking-[0.16em]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Cadastro operacional real
                  </Badge>
                  <Button variant="surface" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
                    <MoonStar className="h-4 w-4" />
                  </Button>
                </div>

                <h1 className="mt-10 max-w-5xl text-4xl font-semibold leading-[1.04] text-white sm:text-5xl lg:text-[4.2rem]">
                  Crie seu
                  <br />
                  workspace, owner e base
                  <br />
                  inicial em um fluxo de{' '}
                  <span className="bg-[linear-gradient(135deg,#33D4FF_0%,#2B89FF_52%,#8F63FF_100%)] bg-clip-text text-transparent">
                    producao real.
                  </span>
                </h1>

                <p className="mt-7 max-w-3xl text-lg leading-9 text-[var(--text-secondary)]">
                  O cadastro provisiona seu salao, a conta principal e a configuracao minima do CRM direto no banco
                  remoto. Sem demo, sem mock e sem bootstrap manual.
                </p>
              </div>

              <div className="mt-10 grid gap-4 lg:grid-cols-3">
                {setupHighlights.map((item) => {
                  const Icon = item.icon

                  return (
                    <Card key={item.title} variant="muted" className="rounded-[26px] border-white/8 bg-[rgba(9,12,20,0.62)] p-5">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.025)] ${item.tone}`}
                      >
                        <Icon className="h-7 w-7" />
                      </div>
                      <h2 className="mt-5 text-[1.45rem] font-semibold leading-8 text-white">{item.title}</h2>
                      <p className="mt-3 text-base leading-8 text-[var(--text-secondary)]">{item.text}</p>
                    </Card>
                  )
                })}
              </div>

              <Card
                variant="muted"
                className="mt-5 rounded-[26px] border-emerald-400/10 bg-[rgba(11,16,24,0.7)] px-5 py-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-emerald-400/12 bg-emerald-400/10 text-emerald-300">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white">Pronto para operar</p>
                    <p className="mt-2 text-base leading-8 text-[var(--text-secondary)]">
                      O owner criado aqui entra no painel web e na extensao do WhatsApp Web com os mesmos dados reais.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Card>

          <Card className="rounded-[34px] p-8 md:p-11">
            <div className="flex h-full flex-col">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                  Criar acesso
                </p>
                <h2 className="mt-5 text-4xl font-semibold text-white md:text-[3.15rem]">Abrir novo workspace</h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--text-secondary)]">
                  Crie uma conta owner real para usar o CRM, a IA e a operacao no WhatsApp Web.
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <Field label="Nome do salao" icon={<Building2 className="h-5 w-5" />}>
                  <Input
                    id="signup-salon"
                    value={salonName}
                    onChange={(event) => setSalonName(event.target.value)}
                    placeholder="Ex.: Studio Ana Beauty"
                    className="h-14 rounded-[18px] border-white/10 bg-transparent pl-12 pr-4 text-base"
                  />
                </Field>

                <Field label="Seu nome" icon={<UserRound className="h-5 w-5" />}>
                  <Input
                    id="signup-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex.: Ana Souza"
                    className="h-14 rounded-[18px] border-white/10 bg-transparent pl-12 pr-4 text-base"
                  />
                </Field>

                <Field label="E-mail" icon={<Mail className="h-5 w-5" />}>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    className="h-14 rounded-[18px] border-white/10 bg-transparent pl-12 pr-4 text-base"
                  />
                </Field>

                <Field label="Senha" icon={<LockKeyhole className="h-5 w-5" />}>
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimo de 8 caracteres"
                    className="h-14 rounded-[18px] border-white/10 bg-transparent pl-12 pr-14 text-base"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute inset-y-0 right-4 flex items-center text-[var(--text-muted)] hover:text-white"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </Field>

                <Field label="Confirmar senha" icon={<LockKeyhole className="h-5 w-5" />}>
                  <Input
                    id="signup-password-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita sua senha"
                    className="h-14 rounded-[18px] border-white/10 bg-transparent pl-12 pr-14 text-base"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute inset-y-0 right-4 flex items-center text-[var(--text-muted)] hover:text-white"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </Field>

                {error ? (
                  <div className="rounded-[22px] border border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                {passwordMismatch ? (
                  <div className="rounded-[22px] border border-amber-400/18 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    As senhas digitadas precisam ser iguais para concluir o cadastro.
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="h-14 w-full rounded-[18px] text-lg"
                  disabled={
                    submitting ||
                    !salonName.trim() ||
                    !name.trim() ||
                    !email.trim() ||
                    password.length < 8 ||
                    !confirmPassword.trim() ||
                    passwordMismatch
                  }
                >
                  {submitting ? 'Criando workspace...' : 'Criar conta e entrar'}
                </Button>
              </form>

              <div className="my-7 flex items-center gap-4 text-sm text-[var(--text-muted)]">
                <div className="h-px flex-1 bg-white/8" />
                <span>ou</span>
                <div className="h-px flex-1 bg-white/8" />
              </div>

              <button
                type="button"
                disabled={googleLoading}
                className={`inline-flex h-14 w-full items-center justify-center gap-3 rounded-[18px] border border-white/10 bg-transparent px-4 text-base font-semibold ${
                  GOOGLE_CLIENT_ID
                    ? 'text-[var(--text-primary)] hover:border-white/16 hover:bg-white/4'
                    : 'text-[var(--text-secondary)] opacity-70'
                }`}
                title={GOOGLE_CLIENT_ID ? 'Cadastrar com Google' : 'OAuth Google ainda nao configurado'}
                onClick={() => void handleGoogleSignup()}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#ea4335]">
                  G
                </span>
                {googleLoading ? 'Conectando com Google...' : 'Cadastrar com Google'}
              </button>

              <Card variant="muted" className="mt-7 rounded-[26px] border-white/8 bg-[rgba(11,16,24,0.7)] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--accent)]/18 bg-[var(--accent-soft)] text-[var(--accent)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">Ja possui conta?</p>
                    <p className="mt-2 text-base leading-8 text-[var(--text-secondary)]">
                      Entre com um workspace existente ou fale com{' '}
                      <a className="text-[var(--accent)] underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                        {SUPPORT_EMAIL}
                      </a>{' '}
                      se quiser onboarding assistido.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button asChild variant="surface" size="sm">
                        <Link href="/login">
                          <ArrowLeft className="h-4 w-4" />
                          Ir para login
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2.5 block text-sm font-medium text-white">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--text-muted)]">
          {icon}
        </div>
        {children}
      </div>
    </div>
  )
}
