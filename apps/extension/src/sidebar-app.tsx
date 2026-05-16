/* eslint-disable react-hooks/exhaustive-deps */

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AiConversationSummaryResult,
  AiIntentResult,
  AiReactivationMessageResult,
  AuthSession,
  ContactDetail,
  QuickReply,
  RecoveryContactCandidate,
  Tag,
} from '@salonzap/sdk'
import { createApiClient } from '@salonzap/sdk'
import {
  Bot,
  ChevronLeft,
  Clock3,
  Copy,
  ExternalLink,
  LayoutDashboard,
  MessageSquareText,
  RefreshCw,
  Rocket,
  Send,
  Sparkles,
  Tags,
  UserRound,
  Users,
} from 'lucide-react'
import { getStoredSession, setStoredSession } from './lib/browser-storage'
import {
  type ChatSnapshot,
  extractConversationContext,
  extractOpenChat,
  insertMessageInComposer,
  openWhatsAppChat,
} from './lib/whatsapp'

const DEFAULT_API_URL =
  import.meta.env.VITE_API_URL ?? 'https://salonzap-crm-api.vercel.app'
const DEFAULT_WEB_URL =
  import.meta.env.VITE_WEB_URL ?? 'https://salonzap-crm-web.vercel.app'

type StageOption = {
  id: string
  name: string
  color: string
}

type FeedbackState = {
  message: string
  tone: 'neutral' | 'success' | 'danger'
}

type ApiStatus = 'checking' | 'online' | 'offline'

type AnalysisState = {
  source: 'openrouter' | 'fallback'
  summary: AiConversationSummaryResult
  intent: AiIntentResult
}

type RecoveryMessageMap = Record<string, AiReactivationMessageResult>

export function SidebarApp() {
  const [open, setOpen] = useState(true)
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [token, setToken] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [chat, setChat] = useState<ChatSnapshot | null>(null)
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [stages, setStages] = useState<StageOption[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [quickReplyQuery, setQuickReplyQuery] = useState('')
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDueAt, setReminderDueAt] = useState('')
  const [recoveryDays, setRecoveryDays] = useState(45)
  const [recoveryCandidates, setRecoveryCandidates] = useState<RecoveryContactCandidate[]>([])
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryGeneratingId, setRecoveryGeneratingId] = useState<string | null>(null)
  const [recoveryMessages, setRecoveryMessages] = useState<RecoveryMessageMap>({})
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [booting, setBooting] = useState(true)
  const [syncingContact, setSyncingContact] = useState(false)
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [aiTargetKey, setAiTargetKey] = useState<string | null>(null)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [aiReplySource, setAiReplySource] = useState<'openrouter' | 'fallback' | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [analysisTargetKey, setAnalysisTargetKey] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisState | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const lastSyncKey = useRef('')
  const deferredQuickReplyQuery = useDeferredValue(quickReplyQuery)
  const activeChatKey = contact?.id ?? chat?.displayName ?? null
  const visibleAiReply = aiTargetKey === activeChatKey ? aiReply : null
  const visibleAiReplySource = aiTargetKey === activeChatKey ? aiReplySource : null
  const visibleAiError = aiTargetKey === activeChatKey ? aiError : null
  const visibleAnalysis = analysisTargetKey === activeChatKey ? analysisResult : null
  const visibleAnalysisError = analysisTargetKey === activeChatKey ? analysisError : null

  const filteredQuickReplies = useMemo(() => {
    const normalizedQuery = deferredQuickReplyQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return quickReplies
    }

    return quickReplies.filter((quickReply) =>
      [quickReply.title, quickReply.shortcut, quickReply.body, quickReply.category ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [deferredQuickReplyQuery, quickReplies])

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: apiUrl,
        getToken: () => token,
        onUnauthorized: async () => {
          setToken(null)
          setSession(null)
          setContact(null)
          setAnalysisResult(null)
          setAiReply(null)
          setRecoveryCandidates([])
          setRecoveryMessages({})
          await setStoredSession(apiUrl, null)
          showFeedback('Sessao expirada. Entre novamente na extensao.', 'danger')
        },
      }),
    [apiUrl, token],
  )

  const showFeedback = (message: string, tone: FeedbackState['tone'] = 'neutral') => {
    setFeedback({ message, tone })
  }

  const openDashboard = () => {
    window.open(`${DEFAULT_WEB_URL}/contacts`, '_blank', 'noopener,noreferrer')
  }

  const checkApiHealth = async (targetApiUrl: string) => {
    setApiStatus('checking')

    try {
      const response = await fetch(`${targetApiUrl.replace(/\/$/, '')}/`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Health check falhou com status ${response.status}.`)
      }

      setApiStatus('online')
    } catch {
      setApiStatus('offline')
    }
  }

  const loadRecoveryCandidates = async (
    client = api,
    daysInactive = recoveryDays,
  ) => {
    setRecoveryLoading(true)

    try {
      const candidates = await client.recoveryCandidates({
        daysInactive,
        limit: 18,
      })
      setRecoveryCandidates(candidates)
    } finally {
      setRecoveryLoading(false)
    }
  }

  const loadReferenceData = async (client = api) => {
    const [profile, tagsResponse, quickRepliesResponse, boardResponse] =
      await Promise.all([
        client.me(),
        client.tags(),
        client.quickReplies(),
        client.kanban(),
      ])

    setSession(profile)
    setTags(tagsResponse)
    setQuickReplies(quickRepliesResponse)
    setStages(
      boardResponse.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
      })),
    )
    await loadRecoveryCandidates(client)
  }

  const syncChat = async (snapshot: ChatSnapshot, force = false) => {
    if (!token) {
      setChat(snapshot)
      return
    }

    const syncKey = `${snapshot.displayName}-${snapshot.phone ?? 'nophone'}`
    if (!force && syncKey === lastSyncKey.current) {
      setChat(snapshot)
      return
    }

    lastSyncKey.current = syncKey
    setChat(snapshot)
    setSyncingContact(true)

    try {
      const detail = await api.syncWhatsappContact(snapshot)
      setContact(detail)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha ao sincronizar o contato com o CRM.'
      showFeedback(message, 'danger')
    } finally {
      setSyncingContact(false)
    }
  }

  useEffect(() => {
    getStoredSession()
      .then(async (stored) => {
        setApiUrl(stored.apiUrl)
        setToken(stored.token)
        await checkApiHealth(stored.apiUrl)

        if (stored.token) {
          const hydratedApi = createApiClient({
            baseUrl: stored.apiUrl,
            getToken: () => stored.token,
          })

          await loadReferenceData(hydratedApi)
        }
      })
      .catch((error) =>
        showFeedback(
          error instanceof Error
            ? error.message
            : 'Falha ao hidratar a extensao.',
          'danger',
        ),
      )
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    const sync = async () => {
      const snapshot = extractOpenChat()
      if (!snapshot) {
        return
      }

      await syncChat(snapshot)
    }

    void sync().catch(() => undefined)

    const observer = new MutationObserver(() => {
      void sync().catch(() => undefined)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title', 'src'],
    })

    const interval = window.setInterval(() => {
      void sync().catch(() => undefined)
    }, 3000)

    return () => {
      observer.disconnect()
      window.clearInterval(interval)
    }
  }, [token])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeout = window.setTimeout(() => setFeedback(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  useEffect(() => {
    if (!token) {
      return
    }

    const timeout = window.setTimeout(() => {
      void loadRecoveryCandidates().catch(() => undefined)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [recoveryDays, token])

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    try {
      const nextSession = await createApiClient({ baseUrl: apiUrl }).login({
        email,
        password,
      })
      const authedApi = createApiClient({
        baseUrl: apiUrl,
        getToken: () => nextSession.accessToken,
      })

      setToken(nextSession.accessToken)
      setSession(nextSession)
      await setStoredSession(apiUrl, nextSession.accessToken)
      await checkApiHealth(apiUrl)
      await loadReferenceData(authedApi)

      if (chat) {
        const detail = await authedApi.syncWhatsappContact(chat)
        setContact(detail)
      }

      showFeedback('Extensao conectada com sucesso.', 'success')
    } catch (error) {
      showFeedback(
        error instanceof Error
          ? error.message
          : 'Falha ao autenticar na extensao.',
        'danger',
      )
    }
  }

  const handleManualSync = async () => {
    if (!token) {
      showFeedback('Entre na extensao antes de sincronizar o chat.', 'danger')
      return
    }

    const snapshot = extractOpenChat()
    if (!snapshot) {
      showFeedback('Abra um chat no WhatsApp Web primeiro.', 'danger')
      return
    }

    await syncChat(snapshot, true)
    showFeedback('Chat sincronizado com o CRM.', 'success')
  }

  const generateRecoveryMessage = async (
    candidate: RecoveryContactCandidate,
  ) => {
    setRecoveryGeneratingId(candidate.id)

    try {
      const message = await api.aiGenerateReactivationMessage({
        contactId: candidate.id,
        daysInactive: candidate.daysWithoutReply,
        objective:
          'Gerar mensagem de reativacao para trazer o cliente de volta ao salao',
      })

      setRecoveryMessages((current) => ({
        ...current,
        [candidate.id]: message,
      }))
      showFeedback('Mensagem de reativacao gerada com IA.', 'success')
      return message
    } catch (error) {
      showFeedback(
        error instanceof Error
          ? error.message
          : 'Falha ao gerar mensagem de reativacao.',
        'danger',
      )
      return null
    } finally {
      setRecoveryGeneratingId(null)
    }
  }

  const openRecoveryChat = async (candidate: RecoveryContactCandidate) => {
    const existingMessage = recoveryMessages[candidate.id]
    const nextMessage =
      existingMessage ?? (await generateRecoveryMessage(candidate))

    if (!nextMessage) {
      return
    }

    const opened = openWhatsAppChat(candidate.phone ?? '', nextMessage.message)
    if (!opened) {
      showFeedback('Contato sem telefone valido para abrir no WhatsApp.', 'danger')
      return
    }

    showFeedback('Chat aberto no WhatsApp com mensagem pronta.', 'success')
  }

  const copyRecoveryMessage = async (candidate: RecoveryContactCandidate) => {
    const existingMessage = recoveryMessages[candidate.id]
    const nextMessage =
      existingMessage ?? (await generateRecoveryMessage(candidate))

    if (!nextMessage) {
      return
    }

    await navigator.clipboard.writeText(nextMessage.message).catch(() => undefined)
    showFeedback('Mensagem de reativacao copiada.', 'success')
  }

  const saveNote = async () => {
    if (!contact || !noteBody.trim()) {
      return
    }

    await api.createNote({
      contactId: contact.id,
      body: noteBody,
      pinned: false,
    })

    setNoteBody('')
    setContact(await api.contact(contact.id))
    showFeedback('Nota salva no CRM.', 'success')
  }

  const createReminder = async () => {
    if (!contact || !reminderTitle.trim() || !reminderDueAt) {
      showFeedback('Preencha titulo e data do lembrete.', 'danger')
      return
    }

    const dueAt = new Date(reminderDueAt)
    if (Number.isNaN(dueAt.getTime())) {
      showFeedback('Data do lembrete invalida.', 'danger')
      return
    }

    await api.createReminder({
      title: reminderTitle.trim(),
      dueAt: dueAt.toISOString(),
      contactId: contact.id,
      status: 'PENDING',
    })

    setReminderTitle('')
    setReminderDueAt('')
    setContact(await api.contact(contact.id))
    showFeedback('Lembrete criado para este contato.', 'success')
  }

  const toggleTag = async (tagId: string) => {
    if (!contact) {
      return
    }

    const nextTagIds = contact.tags.some((tag) => tag.id === tagId)
      ? contact.tags.filter((tag) => tag.id !== tagId).map((tag) => tag.id)
      : [...contact.tags.map((tag) => tag.id), tagId]

    await api.updateContact(contact.id, { tagIds: nextTagIds })
    setContact(await api.contact(contact.id))
    showFeedback('Tags atualizadas.', 'success')
  }

  const applyQuickReply = async (quickReply: QuickReply) => {
    const inserted = insertMessageInComposer(quickReply.body)
    await navigator.clipboard.writeText(quickReply.body).catch(() => undefined)
    showFeedback(
      inserted
        ? `Resposta "${quickReply.title}" aplicada no composer.`
        : 'Resposta copiada. Abra um chat com caixa de mensagem ativa.',
      'success',
    )
  }

  const buildConversationContext = () =>
    extractConversationContext() ||
    [
      `Cliente: ${chat?.displayName ?? 'Contato'}`,
      chat?.statusText ? `Status do chat: ${chat.statusText}` : null,
      contact?.statusText ? `Status CRM: ${contact.statusText}` : null,
      ...((contact?.notes ?? []).slice(0, 2).map((note) => `Nota CRM: ${note.body}`)),
    ]
      .filter(Boolean)
      .join('\n')

  const suggestReplyWithAi = async () => {
    if (!chat) {
      showFeedback(
        'Abra um chat antes de pedir uma sugestao de resposta.',
        'danger',
      )
      return
    }

    const nextAiTargetKey = contact?.id ?? chat.displayName
    setAiTargetKey(nextAiTargetKey)
    setAiLoading(true)
    setAiError(null)

    try {
      const response = await api.aiSuggestReply({
        contactId: contact?.id,
        customerName: chat.displayName,
        conversation: buildConversationContext(),
        goal: 'Sugerir uma resposta curta e pronta para enviar no WhatsApp',
      })

      setAiReply(response.reply)
      setAiReplySource(response.source)

      const inserted = insertMessageInComposer(response.reply)
      await navigator.clipboard.writeText(response.reply).catch(() => undefined)

      showFeedback(
        response.fallbackUsed
          ? inserted
            ? 'Fallback seguro aplicado no composer.'
            : 'Fallback seguro copiado para a area de transferencia.'
          : inserted
            ? 'Resposta da IA aplicada no composer.'
            : 'Resposta da IA copiada para a area de transferencia.',
        response.fallbackUsed ? 'neutral' : 'success',
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha ao gerar resposta com IA.'
      setAiError(message)
      showFeedback(message, 'danger')
    } finally {
      setAiLoading(false)
    }
  }

  const analyzeConversation = async () => {
    if (!chat) {
      showFeedback('Abra um chat antes de analisar a conversa.', 'danger')
      return
    }

    const nextAnalysisTargetKey = contact?.id ?? chat.displayName
    setAnalysisTargetKey(nextAnalysisTargetKey)
    setAnalysisLoading(true)
    setAnalysisError(null)

    try {
      const conversation = buildConversationContext()
      const [summary, intent] = await Promise.all([
        api.aiSummarizeConversation({
          contactId: contact?.id,
          conversation,
        }),
        api.aiIdentifyIntent({
          contactId: contact?.id,
          conversation,
        }),
      ])

      setAnalysisResult({
        source:
          summary.source === 'openrouter' && intent.source === 'openrouter'
            ? 'openrouter'
            : 'fallback',
        summary,
        intent,
      })
      showFeedback('Analise da conversa atualizada.', 'success')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha ao analisar a conversa.'
      setAnalysisError(message)
      showFeedback(message, 'danger')
    } finally {
      setAnalysisLoading(false)
    }
  }

  return (
    <>
      <button
        className="szp-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-label="Alternar sidebar"
      >
        {open ? <ChevronLeft size={18} /> : <Sparkles size={18} />}
      </button>

      <aside className={`szp-panel ${open ? 'is-open' : ''}`}>
        <div className="szp-root">
          <header className="szp-header">
            <div className="szp-brand">
              <div className="szp-brand-badge">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="szp-kicker">SalonZap CRM</p>
                <h1>Sidebar WhatsApp</h1>
                <p className="szp-muted">
                  Contato, funil, IA e follow-up sem sair da conversa.
                </p>
              </div>
            </div>
            <button
              className="szp-icon-button"
              onClick={() => setOpen(false)}
              aria-label="Fechar sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </header>

          {booting ? (
            <div className="szp-skeleton-stack">
              <div className="szp-skeleton szp-skeleton-lg" />
              <div className="szp-skeleton szp-skeleton-md" />
              <div className="szp-skeleton szp-skeleton-xl" />
            </div>
          ) : null}

          {!booting && !token ? (
            <form className="szp-card szp-card-hero szp-form" onSubmit={handleLogin}>
              <p className="szp-section-title">Entrar na API</p>
              <strong>Conectar a extensao ao workspace</strong>
              <p className="szp-muted">
                A API publicada ja esta preconfigurada. Entre com a mesma conta
                operacional do painel web para usar a sidebar no WhatsApp Web.
              </p>
              <label>
                API URL
                <input
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                />
              </label>
              <label>
                E-mail
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button className="szp-primary" type="submit">
                Conectar extensao
              </button>
            </form>
          ) : null}

          {token ? (
            <>
              <div className="szp-card szp-card-hero">
                <div className="szp-row szp-between">
                  <div>
                    <p className="szp-section-title">Sessao operacional</p>
                    <strong>{session?.salon.name ?? 'SalonZap CRM'}</strong>
                    <p className="szp-muted">
                      {session?.user.email ?? 'Conectado'}
                    </p>
                  </div>
                  <div className="szp-inline-actions">
                    <span className="szp-pill is-accent">Ativa</span>
                    <span
                      className={`szp-pill ${apiStatus === 'online' ? 'is-success' : apiStatus === 'offline' ? 'is-danger' : ''}`}
                    >
                      API{' '}
                      {apiStatus === 'online'
                        ? 'online'
                        : apiStatus === 'offline'
                          ? 'offline'
                          : 'checando'}
                    </span>
                  </div>
                </div>

                <div className="szp-stat-grid">
                  <StatusTile label="Etapas" value={`${stages.length}`} />
                  <StatusTile label="Respostas" value={`${quickReplies.length}`} />
                  <StatusTile label="Tags" value={`${tags.length}`} />
                </div>
              </div>

              <div className="szp-card">
                <div className="szp-row szp-between">
                  <div className="szp-row">
                    <Users size={16} />
                    <p className="szp-section-title">Recuperacao de clientes</p>
                  </div>
                  <span className="szp-pill is-accent">
                    {recoveryCandidates.length} na fila
                  </span>
                </div>
                <p className="szp-muted">
                  Lista real de contatos sem interacao recente, pronta para IA
                  + abertura direta do chat no WhatsApp.
                </p>

                <div className="szp-action-grid">
                  <label className="szp-block-field">
                    Dias sem contato
                    <select
                      value={recoveryDays}
                      onChange={(event) =>
                        setRecoveryDays(Number(event.target.value))
                      }
                    >
                      {[30, 45, 60, 90].map((days) => (
                        <option key={days} value={days}>
                          {days} dias
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="szp-secondary"
                    onClick={() => void loadRecoveryCandidates()}
                    disabled={recoveryLoading}
                  >
                    <RefreshCw size={14} />
                    {recoveryLoading ? 'Atualizando...' : 'Atualizar fila'}
                  </button>
                </div>

                {recoveryLoading ? (
                  <div className="szp-skeleton szp-skeleton-md" />
                ) : null}

                <div className="szp-list">
                  {recoveryCandidates.length ? (
                    recoveryCandidates.map((candidate) => {
                      const message = recoveryMessages[candidate.id]
                      const generating = recoveryGeneratingId === candidate.id

                      return (
                        <div key={candidate.id} className="szp-note">
                          <div className="szp-row szp-between">
                            <div>
                              <strong>{candidate.name}</strong>
                              <p>
                                {candidate.phone ?? 'Sem telefone'} •{' '}
                                {candidate.daysWithoutReply} dias sem contato
                              </p>
                            </div>
                            <span className="szp-pill">
                              {candidate.stage.name}
                            </span>
                          </div>

                          <p className="szp-muted">
                            Acao sugerida:{' '}
                            {formatRecoveryAction(candidate.recommendedAction)}
                          </p>

                          <div className="szp-action-grid">
                            <button
                              className="szp-secondary"
                              onClick={() => void generateRecoveryMessage(candidate)}
                              disabled={generating}
                            >
                              <Sparkles size={14} />
                              {generating ? 'Gerando...' : 'Gerar com IA'}
                            </button>
                            <button
                              className="szp-secondary"
                              onClick={() => void copyRecoveryMessage(candidate)}
                              disabled={generating}
                            >
                              <Copy size={14} />
                              Copiar mensagem
                            </button>
                          </div>

                          <button
                            className="szp-primary szp-full-width"
                            onClick={() => void openRecoveryChat(candidate)}
                            disabled={generating}
                          >
                            <Rocket size={14} />
                            Abrir chat com mensagem
                          </button>

                          {message ? (
                            <div className="szp-note szp-note-nested">
                              <div className="szp-row szp-between">
                                <strong>{message.headline}</strong>
                                <span
                                  className={`szp-pill ${message.source === 'openrouter' ? 'is-accent' : ''}`}
                                >
                                  {message.source === 'openrouter'
                                    ? 'IA real'
                                    : 'Fallback'}
                                </span>
                              </div>
                              <p>{message.message}</p>
                              <p>Motivo: {message.reason}</p>
                            </div>
                          ) : null}
                        </div>
                      )
                    })
                  ) : (
                    <div className="szp-empty">
                      Nenhum contato com telefone ficou acima do limite de{' '}
                      {recoveryDays} dias sem interacao.
                    </div>
                  )}
                </div>
              </div>

              <div className="szp-card">
                <div className="szp-row szp-between">
                  <div>
                    <p className="szp-section-title">Chat aberto</p>
                    <strong>
                      {syncingContact
                        ? 'Sincronizando contato...'
                        : 'Contato detectado no WhatsApp'}
                    </strong>
                  </div>
                  <span className={`szp-pill ${chat ? 'is-accent' : ''}`}>
                    {chat ? 'Ativo' : 'Aguardando'}
                  </span>
                </div>

                {chat ? (
                  <div className="szp-contact-strip">
                    <div className="szp-avatar">
                      {chat.avatarUrl ? (
                        <img src={chat.avatarUrl} alt={chat.displayName} />
                      ) : (
                        <UserRound size={18} />
                      )}
                    </div>
                    <div>
                      <strong>{chat.displayName}</strong>
                      <p>
                        {chat.phone ?? 'Sem telefone detectado'} •{' '}
                        {chat.statusText ?? 'Chat ativo'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="szp-empty">
                    Abra um chat no WhatsApp Web para sincronizar o contato e
                    liberar a operacao do CRM direto na conversa.
                  </div>
                )}

                <div className="szp-action-grid">
                  <button className="szp-secondary" onClick={handleManualSync}>
                    <RefreshCw size={14} />
                    Sincronizar agora
                  </button>
                  <button className="szp-secondary" onClick={openDashboard}>
                    <LayoutDashboard size={14} />
                    Abrir painel
                  </button>
                </div>
              </div>

              {contact ? (
                <>
                  <div className="szp-card">
                    <div className="szp-row szp-between">
                      <div>
                        <p className="szp-section-title">Perfil CRM</p>
                        <strong>{contact.name}</strong>
                        <p className="szp-muted">
                          {contact.phone ??
                            contact.email ??
                            'Contato sem telefone ou e-mail'}
                        </p>
                      </div>
                      <span className="szp-pill">{contact.stage.name}</span>
                    </div>

                    <div className="szp-mini-grid">
                      <MiniTile label="Tags" value={`${contact.tags.length}`} />
                      <MiniTile
                        label="Notas"
                        value={`${contact.notes.length}`}
                      />
                      <MiniTile
                        label="Lembretes"
                        value={`${contact.reminders.length}`}
                      />
                    </div>

                    <label className="szp-block-field">
                      Stage
                      <select
                        value={contact.stage.id}
                        onChange={async (event) => {
                          await api.moveContact({
                            contactId: contact.id,
                            targetStageId: event.target.value,
                          })
                          setContact(await api.contact(contact.id))
                          showFeedback('Stage atualizado.', 'success')
                        }}
                      >
                        {stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="szp-block-field">
                      Nota rapida
                      <textarea
                        value={noteBody}
                        onChange={(event) => setNoteBody(event.target.value)}
                        placeholder="Registrar contexto, objecao, interesse ou proximo passo..."
                      />
                    </label>
                    <button className="szp-primary" onClick={saveNote}>
                      <Send size={14} />
                      Salvar nota
                    </button>
                  </div>

                  <div className="szp-card">
                    <div className="szp-row szp-between">
                      <div className="szp-row">
                        <Bot size={16} />
                        <p className="szp-section-title">Assistente IA</p>
                      </div>
                      {visibleAiReplySource ? (
                        <span
                          className={`szp-pill ${visibleAiReplySource === 'openrouter' ? 'is-accent' : ''}`}
                        >
                          {visibleAiReplySource === 'openrouter'
                            ? 'IA real'
                            : 'Fallback'}
                        </span>
                      ) : null}
                    </div>
                    <p className="szp-muted">
                      Gera resposta pronta, resume a conversa e identifica a
                      intencao principal do cliente.
                    </p>
                    <div className="szp-action-grid">
                      <button
                        className="szp-primary"
                        onClick={suggestReplyWithAi}
                        disabled={!chat || aiLoading}
                      >
                        <Sparkles size={14} />
                        {aiLoading ? 'Gerando resposta...' : 'Responder com IA'}
                      </button>
                      <button
                        className="szp-secondary"
                        onClick={analyzeConversation}
                        disabled={!chat || analysisLoading}
                      >
                        <Bot size={14} />
                        {analysisLoading ? 'Analisando...' : 'Analisar conversa'}
                      </button>
                    </div>
                    {aiLoading || analysisLoading ? (
                      <div className="szp-skeleton szp-skeleton-md" />
                    ) : null}
                    {visibleAiError ? (
                      <div className="szp-note">
                        <strong>Falha ao usar a IA</strong>
                        <p>{visibleAiError}</p>
                      </div>
                    ) : null}
                    {visibleAiReply ? (
                      <div className="szp-note">
                        <strong>Resposta sugerida</strong>
                        <p>{visibleAiReply}</p>
                      </div>
                    ) : null}
                    {visibleAnalysisError ? (
                      <div className="szp-note">
                        <strong>Falha na analise</strong>
                        <p>{visibleAnalysisError}</p>
                      </div>
                    ) : null}
                    {visibleAnalysis ? (
                      <div className="szp-analysis-grid">
                        <div className="szp-note">
                          <div className="szp-row szp-between">
                            <strong>Intencao detectada</strong>
                            <span
                              className={`szp-pill ${visibleAnalysis.source === 'openrouter' ? 'is-accent' : ''}`}
                            >
                              {visibleAnalysis.intent.intent}
                            </span>
                          </div>
                          <p>
                            Confianca: {visibleAnalysis.intent.confidence} •{' '}
                            {visibleAnalysis.intent.rationale}
                          </p>
                        </div>
                        <div className="szp-note">
                          <strong>Resumo comercial</strong>
                          <p>{visibleAnalysis.summary.summary}</p>
                          <p>
                            Proximo passo: {visibleAnalysis.summary.nextStep}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="szp-card">
                    <div className="szp-row">
                      <Clock3 size={16} />
                      <p className="szp-section-title">Lembrete rapido</p>
                    </div>
                    <div className="szp-action-grid">
                      <label className="szp-block-field">
                        Titulo
                        <input
                          value={reminderTitle}
                          onChange={(event) => setReminderTitle(event.target.value)}
                          placeholder="Ex.: Retornar cliente em 2 dias"
                        />
                      </label>
                      <label className="szp-block-field">
                        Quando
                        <input
                          type="datetime-local"
                          value={reminderDueAt}
                          onChange={(event) => setReminderDueAt(event.target.value)}
                        />
                      </label>
                    </div>
                    <button className="szp-primary" onClick={createReminder}>
                      <Clock3 size={14} />
                      Criar lembrete
                    </button>
                  </div>

                  <div className="szp-card">
                    <div className="szp-row">
                      <Tags size={16} />
                      <p className="szp-section-title">Tags</p>
                    </div>
                    <div className="szp-chip-grid">
                      {tags.map((tag) => {
                        const active = contact.tags.some((item) => item.id === tag.id)
                        return (
                          <button
                            key={tag.id}
                            className={`szp-chip ${active ? 'is-active' : ''}`}
                            style={
                              active
                                ? { backgroundColor: tag.color, color: '#071015' }
                                : undefined
                            }
                            onClick={async () => toggleTag(tag.id)}
                          >
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="szp-card">
                    <div className="szp-row">
                      <MessageSquareText size={16} />
                      <p className="szp-section-title">Respostas rapidas</p>
                    </div>
                    <label className="szp-block-field">
                      Buscar resposta
                      <input
                        value={quickReplyQuery}
                        onChange={(event) => setQuickReplyQuery(event.target.value)}
                        placeholder="Buscar por titulo, atalho ou conteudo..."
                      />
                    </label>
                    <div className="szp-list">
                      {filteredQuickReplies.length ? (
                        filteredQuickReplies.map((quickReply) => (
                          <button
                            key={quickReply.id}
                            className="szp-list-item"
                            onClick={() => applyQuickReply(quickReply)}
                          >
                            <div>
                              <strong>{quickReply.title}</strong>
                              <p>
                                {quickReply.shortcut} •{' '}
                                {quickReply.body.slice(0, 86)}...
                              </p>
                            </div>
                            <ExternalLink size={14} />
                          </button>
                        ))
                      ) : (
                        <div className="szp-empty">
                          Nenhuma resposta rapida encontrada para essa busca.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="szp-card">
                    <p className="szp-section-title">Notas recentes</p>
                    <div className="szp-list">
                      {contact.notes.length ? (
                        contact.notes.map((note) => (
                          <div key={note.id} className="szp-note">
                            <div className="szp-row szp-between">
                              <strong>{note.author.name}</strong>
                              {note.pinned ? (
                                <span className="szp-pill">Fixada</span>
                              ) : null}
                            </div>
                            <p>{note.body}</p>
                          </div>
                        ))
                      ) : (
                        <div className="szp-empty">
                          Sem notas ainda para este contato.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="szp-card">
                  <div className="szp-empty">
                    O contato detectado sera criado ou sincronizado
                    automaticamente assim que a API estiver conectada.
                  </div>
                </div>
              )}

              <div className="szp-card">
                <p className="szp-section-title">Sessao</p>
                <p className="szp-muted">
                  {session?.user.email ?? 'Conectado'}
                </p>
                <button
                  className="szp-secondary"
                  onClick={async () => {
                    setToken(null)
                    setSession(null)
                    setContact(null)
                    setAnalysisResult(null)
                    setAiReply(null)
                    setRecoveryCandidates([])
                    setRecoveryMessages({})
                    await setStoredSession(apiUrl, null)
                    showFeedback('Sessao encerrada.', 'neutral')
                  }}
                >
                  Sair da extensao
                </button>
              </div>
            </>
          ) : null}

          {feedback ? (
            <div className={`szp-feedback is-${feedback.tone}`}>
              {feedback.message}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="szp-stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="szp-mini-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatRecoveryAction(action: RecoveryContactCandidate['recommendedAction']) {
  switch (action) {
    case 'reativar_com_oferta':
      return 'Reativar com oferta'
    case 'retomar_conversa':
      return 'Retomar conversa'
    default:
      return 'Follow-up leve'
  }
}
