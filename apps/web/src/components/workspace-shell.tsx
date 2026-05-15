'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BellRing,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  MoonStar,
  PanelsTopLeft,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './providers/auth-provider'
import { useTheme } from './providers/theme-provider'
import { Avatar } from './ui/avatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    eyebrow: 'Executive view',
    description: 'Monitor pipeline pressure, retention risk, and team momentum in one premium cockpit.',
  },
  {
    href: '/contacts',
    label: 'Contatos',
    icon: Users,
    eyebrow: 'CRM graph',
    description: 'Open the contact graph, notes, tags, and reminders without leaving the main workspace.',
  },
  {
    href: '/kanban',
    label: 'Kanban',
    icon: PanelsTopLeft,
    eyebrow: 'Pipeline flow',
    description: 'Drag leads across stages with real backend persistence and smooth board interactions.',
  },
  {
    href: '/campaigns',
    label: 'Campanhas',
    icon: Boxes,
    eyebrow: 'Outbound engine',
    description: 'Build reactivation flows, schedule sends, and keep communication tidy for the team.',
  },
  {
    href: '/quick-replies',
    label: 'Respostas rapidas',
    icon: MessageSquareText,
    eyebrow: 'Playbooks',
    description: 'Standardize tone, recovery scripts, and fast replies shared with the extension sidebar.',
  },
  {
    href: '/reminders',
    label: 'Lembretes',
    icon: BellRing,
    eyebrow: 'Follow-up stack',
    description: 'Keep high-value leads warm with deadlines, ownership, and visible commercial follow-up.',
  },
  {
    href: '/settings',
    label: 'Configuracoes',
    icon: Settings2,
    eyebrow: 'Operations setup',
    description: 'Tune brand feel, taxonomy, and extension readiness without touching backend contracts.',
  },
] as const

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { session, loading, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeItem = useMemo(
    () => navItems.find((item) => pathname === item.href) ?? navItems[0],
    [pathname],
  )

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, router, session])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [pathname])

  if (loading || !session) {
    return <WorkspaceShellSkeleton />
  }

  return (
    <div className="min-h-screen xl:flex">
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/66 backdrop-blur-sm transition xl:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[320px] max-w-[calc(100vw-1rem)] px-3 py-3 transition duration-300 xl:sticky xl:top-0 xl:h-screen xl:translate-x-0 xl:px-4 xl:py-4',
          mobileOpen ? 'translate-x-0' : '-translate-x-[104%]',
        )}
      >
        <Card className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/8 bg-[linear-gradient(135deg,var(--accent),var(--accent-strong),var(--accent-warm))] text-slate-950 shadow-[var(--shadow-glow)]">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">SalonZap CRM</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{session.salon.name}</h2>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="xl:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu lateral">
              <LogOut className="h-4 w-4 rotate-180" />
            </Button>
          </div>

          <Card variant="spotlight" className="p-4">
            <Badge tone="accent">WhatsApp-first SaaS</Badge>
            <p className="mt-4 text-lg font-semibold text-white">
              {session.salon.welcomeMessage ?? 'Client recovery, follow-up, and conversion now share one elegant workspace.'}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStatus label="Theme" value={theme === 'obsidian' ? 'Obsidian' : 'Graphite'} />
              <MiniStatus label="Sync" value="Live" accent />
            </div>
          </Card>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-start gap-3 rounded-[24px] border px-4 py-3.5 transition',
                    active
                      ? 'border-[var(--accent)]/16 bg-[var(--accent-soft)] text-white shadow-[var(--shadow-glow)]'
                      : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-white/6 hover:text-white',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-10 w-10 items-center justify-center rounded-[16px] border transition',
                      active
                        ? 'border-[var(--accent)]/16 bg-white/8 text-[var(--accent)]'
                        : 'border-white/8 bg-white/5 text-[var(--text-muted)] group-hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-current/65">{item.eyebrow}</p>
                  </div>
                </Link>
              )
            })}
          </nav>

          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <Avatar name={session.user.name} size="lg" showStatus />
              <div className="min-w-0">
                <p className="font-semibold text-white">{session.user.name}</p>
                <p className="truncate text-sm text-[var(--text-secondary)]">{session.user.email}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="surface" size="icon" onClick={toggleTheme} title="Alternar tema" aria-label="Alternar tema">
                <MoonStar className="h-4 w-4" />
              </Button>
              <Button variant="secondary" className="flex-1" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </Card>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[rgba(6,8,12,0.76)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-3 px-4 py-4 md:items-center md:gap-4 md:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="surface" size="icon" className="xl:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu lateral">
                <Menu className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">{activeItem.eyebrow}</p>
                <h1 className="truncate text-lg font-semibold text-white md:text-2xl">{activeItem.label}</h1>
                <p className="mt-1 hidden text-sm text-[var(--text-secondary)] md:block">{activeItem.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone="accent" className="hidden md:inline-flex">
                <Sparkles className="h-3.5 w-3.5" />
                Extension synced
              </Badge>
              <Button variant="surface" size="icon" onClick={toggleTheme} title="Alternar tema" aria-label="Alternar tema">
                <MoonStar className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 md:py-8 xl:px-8">{children}</main>
      </div>
    </div>
  )
}

function MiniStatus({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-subtle)] bg-white/5 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      <p className={cn('mt-2 text-sm font-semibold', accent ? 'text-[var(--accent)]' : 'text-white')}>{value}</p>
    </div>
  )
}

function WorkspaceShellSkeleton() {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-[320px] px-4 py-4 xl:block">
        <Card className="flex h-[calc(100vh-2rem)] flex-col gap-4 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="mt-auto h-28 w-full" />
        </Card>
      </aside>

      <div className="flex-1 px-4 py-4 md:px-6 xl:px-8">
        <Skeleton className="h-[4.5rem] w-full rounded-[30px]" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-[340px] w-full" />
          <Skeleton className="h-[340px] w-full" />
        </div>
      </div>
    </div>
  )
}
