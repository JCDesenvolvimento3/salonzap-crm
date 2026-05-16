import { type ClassValue, clsx } from 'clsx'
import { format, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return 'Sem data'
  }

  return format(new Date(value), "dd 'de' MMM, HH:mm", { locale: ptBR })
}

export function formatShortDate(value?: string | Date | null) {
  if (!value) {
    return 'Sem data'
  }

  return format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDueLabel(value?: string | Date | null) {
  if (!value) {
    return 'Sem prazo'
  }

  const date = new Date(value)

  if (isToday(date)) {
    return `Hoje, ${format(date, 'HH:mm')}`
  }

  if (isTomorrow(date)) {
    return `Amanha, ${format(date, 'HH:mm')}`
  }

  return format(date, "dd/MM 'as' HH:mm", { locale: ptBR })
}

export function initials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: value > 999 ? 1 : 0,
  }).format(value)
}

export function humanizeToken(value?: string | null) {
  if (!value) {
    return 'Sem status'
  }

  const dictionary: Record<string, string> = {
    DRAFT: 'Rascunho',
    SCHEDULED: 'Agendada',
    SENT: 'Enviada',
    PAUSED: 'Pausada',
    PENDING: 'Pendente',
    DONE: 'Concluido',
    LOW: 'Baixa',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    POSITIVE: 'Positivo',
    NEUTRAL: 'Neutro',
    NEGATIVE: 'Negativo',
    CREATED: 'Criado',
    UPDATED: 'Atualizado',
    DELETED: 'Removido',
    COMPLETED: 'Concluido',
    MOVED_STAGE: 'Mudou de etapa',
    NOTE_CREATED: 'Nota criada',
    NOTE_UPDATED: 'Nota atualizada',
    NOTE_DELETED: 'Nota removida',
    AI_SUCCESS: 'IA real',
    AI_FALLBACK: 'Fallback seguro',
    SYNCED_FROM_WHATSAPP: 'Sync do WhatsApp',
    CAPTURED_FROM_WHATSAPP: 'Capturado do WhatsApp',
    RESCHEDULE_OR_CANCELLATION: 'Remarcacao ou cancelamento',
    PRICE_QUOTE: 'Pedido de preco',
    BOOKING: 'Agendamento',
    GENERAL_SUPPORT: 'Atendimento geral',
  }

  const normalized = value.trim().toUpperCase()
  if (dictionary[normalized]) {
    return dictionary[normalized]
  }

  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const safeHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized

  const bigint = Number.parseInt(safeHex, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getStatusTone(status?: string | null) {
  const normalized = status?.toUpperCase() ?? ''

  if (normalized.includes('DONE') || normalized.includes('SENT') || normalized.includes('CLIENTE')) {
    return 'success' as const
  }

  if (normalized.includes('PENDING') || normalized.includes('DRAFT') || normalized.includes('SCHEDULED')) {
    return 'warning' as const
  }

  if (normalized.includes('CANCEL') || normalized.includes('ERROR') || normalized.includes('FAIL')) {
    return 'danger' as const
  }

  return 'accent' as const
}
