export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  salonId: string
}

export type SalonProfile = {
  id: string
  name: string
  slug: string
  timezone: string
  welcomeMessage: string | null
}

export type AuthSession = {
  accessToken: string
  user: AuthUser
  salon: SalonProfile
}

export type RegisterWorkspacePayload = {
  salonName: string
  name: string
  email: string
  password: string
}

export type GoogleAuthPayload = {
  code: string
  redirectUri: string
  salonName?: string
}

export type Stage = {
  id: string
  name: string
  slug: string
  color: string
  order: number
  winProbability: number
}

export type Tag = {
  id: string
  name: string
  color: string
  createdAt: string
}

export type Contact = {
  id: string
  name: string
  phone: string | null
  email: string | null
  city: string | null
  source: string
  statusText: string | null
  avatarUrl: string | null
  whatsappName: string | null
  lastInteractionAt: string | null
  createdAt: string
  updatedAt: string
  stage: Stage
  tags: Tag[]
  notesCount?: number
  remindersCount?: number
}

export type Note = {
  id: string
  body: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  contactId: string
  author: Pick<AuthUser, 'id' | 'name'>
}

export type QuickReply = {
  id: string
  title: string
  shortcut: string
  body: string
  category: string | null
  createdAt: string
  updatedAt: string
}

export type Reminder = {
  id: string
  title: string
  description: string | null
  dueAt: string
  status: 'PENDING' | 'DONE'
  contactId: string | null
  createdAt: string
  updatedAt: string
  contact?: Pick<Contact, 'id' | 'name' | 'phone'> | null
}

export type Campaign = {
  id: string
  title: string
  message: string
  audience: string
  scheduledFor: string | null
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'PAUSED'
  createdAt: string
  updatedAt: string
}

export type ActivityLogEntry = {
  id: string
  entityType: string
  entityId: string | null
  action: string
  title: string
  description: string
  metadata: Record<string, unknown> | null
  createdAt: string
  user: Pick<AuthUser, 'id' | 'name'> | null
}

export type AiResponseSource = 'openrouter' | 'fallback'

export type AiResponseMeta = {
  source: AiResponseSource
  fallbackUsed: boolean
  model: string
  logId: string | null
}

export type AiSuggestedReplyResult = AiResponseMeta & {
  reply: string
  tone: string
}

export type AiConversationSummaryResult = AiResponseMeta & {
  summary: string
  nextStep: string
  sentiment: 'positive' | 'neutral' | 'negative'
}

export type AiIntentResult = AiResponseMeta & {
  intent: string
  confidence: 'low' | 'medium' | 'high'
  rationale: string
}

export type AiCampaignResult = AiResponseMeta & {
  title: string
  audience: string
  message: string
}

export type AiReactivationMessageResult = AiResponseMeta & {
  headline: string
  message: string
  reason: string
}

export type DashboardSummary = {
  totals: {
    contacts: number
    activeContacts: number
    contactsCreatedToday: number
    remindersDue: number
    remindersOverdue: number
    remindersToday: number
    campaignsScheduled: number
    campaignsSent: number
    quickReplies: number
    aiUsageToday: number
    aiLogsTotal: number
    aiSuccessCount: number
    aiFallbackCount: number
  }
  conversionRate: number
  contactsThisMonth: number
  stageDistribution: Array<Stage & { contactsCount: number }>
  recentNotes: Note[]
  upcomingReminders: Reminder[]
  recentActivities: ActivityLogEntry[]
  latestActivity: ActivityLogEntry | null
}

export type ContactDetail = Contact & {
  notes: Note[]
  reminders: Reminder[]
  activities: ActivityLogEntry[]
}

export type RecoveryContactCandidate = Contact & {
  lastTouchAt: string
  daysWithoutReply: number
  recommendedAction: 'follow_up_leve' | 'retomar_conversa' | 'reativar_com_oferta'
}

export type KanbanBoard = {
  stages: Array<Stage & { contacts: Contact[] }>
}

export type SettingsProfile = {
  salon: SalonProfile & { brandColor: string }
  user: AuthUser
  tags: Tag[]
  stages: Array<Stage & { contactsCount: number }>
  runtime: {
    siteUrl: string | null
    aiProvider: string
    aiModel: string
    aiEnabled: boolean
  }
}

type RequestConfig = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string | null
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export type ApiClientOptions = {
  baseUrl: string
  getToken?: () => string | null
  onUnauthorized?: () => void
}

function createUrl(baseUrl: string, path: string, search?: Record<string, string | undefined>) {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const url = new URL(`${normalizedBase}${path}`)

  Object.entries(search ?? {}).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

async function request<T>(
  baseUrl: string,
  path: string,
  { method = 'GET', body, token }: RequestConfig,
  onUnauthorized?: () => void,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(createUrl(baseUrl, path), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    throw new ApiError(
      error instanceof Error && /fetch/i.test(error.message)
        ? 'Nao foi possivel conectar com a API do SalonZap. Verifique a URL configurada e tente novamente.'
        : error instanceof Error
          ? error.message
          : 'Nao foi possivel conectar com a API do SalonZap.',
      0,
      null,
    )
  }

  const contentType = response.headers.get('content-type')
  const payload = contentType?.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.()
    }

    throw new ApiError(
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message: string }).message)
        : `Request failed with status ${response.status}`,
      response.status,
      payload,
    )
  }

  return payload as T
}

export function createApiClient({ baseUrl, getToken, onUnauthorized }: ApiClientOptions) {
  const authed = <T>(path: string, config?: Omit<RequestConfig, 'token'>) =>
    request<T>(baseUrl, path, { ...config, token: getToken?.() ?? null }, onUnauthorized)

  return {
    login: (body: { email: string; password: string }) =>
      request<AuthSession>(baseUrl, '/auth/login', { method: 'POST', body }, onUnauthorized),
    register: (body: RegisterWorkspacePayload) =>
      request<AuthSession>(baseUrl, '/auth/register', { method: 'POST', body }, onUnauthorized),
    googleAuth: (body: GoogleAuthPayload) =>
      request<AuthSession>(baseUrl, '/auth/google', { method: 'POST', body }, onUnauthorized),
    forgotPassword: (body: { email: string }) =>
      request<{ success: true }>(baseUrl, '/auth/forgot-password', { method: 'POST', body }, onUnauthorized),
    resetPassword: (body: { token: string; password: string }) =>
      request<{ success: true }>(baseUrl, '/auth/reset-password', { method: 'POST', body }, onUnauthorized),
    me: () => authed<AuthSession>('/auth/me'),
    dashboard: () => authed<DashboardSummary>('/dashboard/summary'),
    contacts: (search?: { query?: string; stageId?: string }) =>
      authed<Contact[]>(`/contacts${createQuery(search)}`),
    recoveryCandidates: (search?: { daysInactive?: number; limit?: number }) =>
      authed<RecoveryContactCandidate[]>(
        `/contacts/recovery-candidates${createQuery(
          search
            ? Object.fromEntries(
                Object.entries(search).map(([key, value]) => [
                  key,
                  value?.toString(),
                ]),
              )
            : undefined,
        )}`,
      ),
    contact: (id: string) => authed<ContactDetail>(`/contacts/${id}`),
    createContact: (body: Record<string, unknown>) => authed<Contact>('/contacts', { method: 'POST', body }),
    updateContact: (id: string, body: Record<string, unknown>) =>
      authed<Contact>(`/contacts/${id}`, { method: 'PATCH', body }),
    deleteContact: (id: string) => authed<{ success: true }>(`/contacts/${id}`, { method: 'DELETE' }),
    syncWhatsappContact: (body: Record<string, unknown>) =>
      authed<ContactDetail>('/contacts/sync-from-whatsapp', { method: 'POST', body }),
    tags: () => authed<Tag[]>('/tags'),
    createTag: (body: Record<string, unknown>) => authed<Tag>('/tags', { method: 'POST', body }),
    updateTag: (id: string, body: Record<string, unknown>) => authed<Tag>(`/tags/${id}`, { method: 'PATCH', body }),
    deleteTag: (id: string) => authed<{ success: true }>(`/tags/${id}`, { method: 'DELETE' }),
    notes: (contactId?: string) => authed<Note[]>(`/notes${createQuery({ contactId })}`),
    createNote: (body: Record<string, unknown>) => authed<Note>('/notes', { method: 'POST', body }),
    updateNote: (id: string, body: Record<string, unknown>) => authed<Note>(`/notes/${id}`, { method: 'PATCH', body }),
    deleteNote: (id: string) => authed<{ success: true }>(`/notes/${id}`, { method: 'DELETE' }),
    quickReplies: () => authed<QuickReply[]>('/quick-replies'),
    createQuickReply: (body: Record<string, unknown>) =>
      authed<QuickReply>('/quick-replies', { method: 'POST', body }),
    updateQuickReply: (id: string, body: Record<string, unknown>) =>
      authed<QuickReply>(`/quick-replies/${id}`, { method: 'PATCH', body }),
    deleteQuickReply: (id: string) =>
      authed<{ success: true }>(`/quick-replies/${id}`, { method: 'DELETE' }),
    reminders: (status?: string) => authed<Reminder[]>(`/reminders${createQuery({ status })}`),
    createReminder: (body: Record<string, unknown>) => authed<Reminder>('/reminders', { method: 'POST', body }),
    updateReminder: (id: string, body: Record<string, unknown>) =>
      authed<Reminder>(`/reminders/${id}`, { method: 'PATCH', body }),
    deleteReminder: (id: string) => authed<{ success: true }>(`/reminders/${id}`, { method: 'DELETE' }),
    campaigns: () => authed<Campaign[]>('/campaigns'),
    createCampaign: (body: Record<string, unknown>) => authed<Campaign>('/campaigns', { method: 'POST', body }),
    updateCampaign: (id: string, body: Record<string, unknown>) =>
      authed<Campaign>(`/campaigns/${id}`, { method: 'PATCH', body }),
    deleteCampaign: (id: string) => authed<{ success: true }>(`/campaigns/${id}`, { method: 'DELETE' }),
    kanban: () => authed<KanbanBoard>('/kanban/board'),
    moveContact: (body: { contactId: string; targetStageId: string }) =>
      authed<Contact>('/kanban/move', { method: 'PATCH', body }),
    settings: () => authed<SettingsProfile>('/settings/profile'),
    updateSettings: (body: Record<string, unknown>) =>
      authed<SettingsProfile>('/settings/profile', { method: 'PATCH', body }),
    aiSuggestReply: (body: {
      contactId?: string
      customerName?: string
      conversation: string
      goal?: string
    }) => authed<AiSuggestedReplyResult>('/ai/suggest-reply', { method: 'POST', body }),
    aiSummarizeConversation: (body: { contactId?: string; conversation: string }) =>
      authed<AiConversationSummaryResult>('/ai/summarize-conversation', { method: 'POST', body }),
    aiIdentifyIntent: (body: { contactId?: string; conversation: string }) =>
      authed<AiIntentResult>('/ai/identify-intent', { method: 'POST', body }),
    aiGenerateCampaign: (body: { prompt: string; objective?: string; audienceHint?: string }) =>
      authed<AiCampaignResult>('/ai/generate-campaign', { method: 'POST', body }),
    aiGenerateReactivationMessage: (body: {
      contactId: string
      daysInactive?: number
      objective?: string
    }) =>
      authed<AiReactivationMessageResult>('/ai/generate-reactivation-message', {
        method: 'POST',
        body,
      }),
  }
}

function createQuery(search?: Record<string, string | undefined>) {
  if (!search) {
    return ''
  }

  const params = new URLSearchParams()

  Object.entries(search).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}
