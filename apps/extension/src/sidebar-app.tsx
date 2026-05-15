/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { AuthSession, ContactDetail, QuickReply, Tag } from '@salonzap/sdk'
import { createApiClient } from '@salonzap/sdk'
import {
  ChevronLeft,
  ExternalLink,
  MessageSquareText,
  Send,
  Sparkles,
  Tags,
  UserRound,
} from 'lucide-react'
import { getStoredSession, setStoredSession } from './lib/browser-storage'
import { type ChatSnapshot, extractConversationContext, extractOpenChat, insertMessageInComposer } from './lib/whatsapp'

type StageOption = {
  id: string
  name: string
  color: string
}

type FeedbackState = {
  message: string
  tone: 'neutral' | 'success' | 'danger'
}

export function SidebarApp() {
  const [open, setOpen] = useState(true)
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL ?? 'http://localhost:3333')
  const [token, setToken] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [chat, setChat] = useState<ChatSnapshot | null>(null)
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [stages, setStages] = useState<StageOption[]>([])
  const [email, setEmail] = useState('admin@salonzap.local')
  const [password, setPassword] = useState('123456')
  const [noteBody, setNoteBody] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [booting, setBooting] = useState(true)
  const [syncingContact, setSyncingContact] = useState(false)
  const [aiTargetKey, setAiTargetKey] = useState<string | null>(null)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [aiReplySource, setAiReplySource] = useState<'openrouter' | 'fallback' | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const lastSyncKey = useRef('')
  const activeAiTargetKey = contact?.id ?? chat?.displayName ?? null
  const visibleAiReply = aiTargetKey === activeAiTargetKey ? aiReply : null
  const visibleAiReplySource = aiTargetKey === activeAiTargetKey ? aiReplySource : null
  const visibleAiError = aiTargetKey === activeAiTargetKey ? aiError : null

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: apiUrl,
        getToken: () => token,
        onUnauthorized: async () => {
          setToken(null)
          setSession(null)
          setContact(null)
          await setStoredSession(apiUrl, null)
        },
      }),
    [apiUrl, token],
  )

  const showFeedback = (message: string, tone: FeedbackState['tone'] = 'neutral') => {
    setFeedback({ message, tone })
  }

  const loadReferenceData = async (client = api) => {
    const [profile, tagsResponse, quickRepliesResponse, boardResponse] = await Promise.all([
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
  }

  const syncChat = async (snapshot: ChatSnapshot) => {
    if (!token) {
      setChat(snapshot)
      return
    }

    const syncKey = `${snapshot.displayName}-${snapshot.phone ?? 'nophone'}`
    if (syncKey === lastSyncKey.current) {
      setChat(snapshot)
      return
    }

    lastSyncKey.current = syncKey
    setChat(snapshot)
    setSyncingContact(true)

    try {
      const detail = await api.syncWhatsappContact(snapshot)
      setContact(detail)
    } finally {
      setSyncingContact(false)
    }
  }

  useEffect(() => {
    getStoredSession()
      .then(async (stored) => {
        setApiUrl(stored.apiUrl)
        setToken(stored.token)

        if (stored.token) {
          const hydratedApi = createApiClient({
            baseUrl: stored.apiUrl,
            getToken: () => stored.token,
          })

          await loadReferenceData(hydratedApi)
        }
      })
      .catch((error) => showFeedback(error instanceof Error ? error.message : 'Falha ao hidratar a extensao.', 'danger'))
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

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    try {
      const nextSession = await createApiClient({ baseUrl: apiUrl }).login({ email, password })
      const authedApi = createApiClient({
        baseUrl: apiUrl,
        getToken: () => nextSession.accessToken,
      })

      setToken(nextSession.accessToken)
      setSession(nextSession)
      await setStoredSession(apiUrl, nextSession.accessToken)
      await loadReferenceData(authedApi)
      if (chat) {
        const detail = await authedApi.syncWhatsappContact(chat)
        setContact(detail)
      }
      showFeedback('Extensao conectada com sucesso.', 'success')
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'Falha ao autenticar na extensao.', 'danger')
    }
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

  const suggestReplyWithAi = async () => {
    if (!chat) {
      showFeedback('Abra um chat antes de pedir uma sugestao de resposta.', 'danger')
      return
    }

    const nextAiTargetKey = contact?.id ?? chat.displayName
    setAiTargetKey(nextAiTargetKey)
    setAiLoading(true)
    setAiError(null)

    const conversation =
      extractConversationContext() ||
      [
        `Cliente: ${chat.displayName}`,
        chat.statusText ? `Status do chat: ${chat.statusText}` : null,
        contact?.statusText ? `Status CRM: ${contact.statusText}` : null,
        ...((contact?.notes ?? []).slice(0, 2).map((note) => `Nota CRM: ${note.body}`)),
      ]
        .filter(Boolean)
        .join('\n')

    try {
      const response = await api.aiSuggestReply({
        contactId: contact?.id,
        customerName: chat.displayName,
        conversation,
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
      const message = error instanceof Error ? error.message : 'Falha ao gerar resposta com IA.'
      setAiError(message)
      showFeedback(message, 'danger')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <>
      <button className="szp-toggle" onClick={() => setOpen((current) => !current)} aria-label="Alternar sidebar">
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
                <h1>WhatsApp sidebar</h1>
                <p className="szp-muted">Fast salon context, now with a cleaner premium shell.</p>
              </div>
            </div>
            <button className="szp-icon-button" onClick={() => setOpen(false)} aria-label="Fechar sidebar">
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
                Use o mesmo usuario do painel web para liberar tags, stages e respostas rapidas dentro do WhatsApp Web.
              </p>
              <label>
                API URL
                <input value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} />
              </label>
              <label>
                E-mail
                <input value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label>
                Senha
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
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
                    <p className="szp-section-title">Live session</p>
                    <strong>{session?.salon.name ?? 'SalonZap CRM'}</strong>
                    <p className="szp-muted">{session?.user.email ?? 'Conectado'}</p>
                  </div>
                  <span className="szp-pill is-accent">Live</span>
                </div>

                <div className="szp-stat-grid">
                  <StatusTile label="Stages" value={`${stages.length}`} />
                  <StatusTile label="Replies" value={`${quickReplies.length}`} />
                  <StatusTile label="Tags" value={`${tags.length}`} />
                </div>
              </div>

              <div className="szp-card">
                <div className="szp-row szp-between">
                  <div>
                    <p className="szp-section-title">Chat aberto</p>
                    <strong>{syncingContact ? 'Sincronizando contato...' : 'Contato detectado no WhatsApp'}</strong>
                  </div>
                  <span className={`szp-pill ${chat ? 'is-accent' : ''}`}>{chat ? 'Ativo' : 'Aguardando'}</span>
                </div>

                {chat ? (
                  <div className="szp-contact-strip">
                    <div className="szp-avatar">
                      {chat.avatarUrl ? <img src={chat.avatarUrl} alt={chat.displayName} /> : <UserRound size={18} />}
                    </div>
                    <div>
                      <strong>{chat.displayName}</strong>
                      <p>{chat.phone ?? 'Sem telefone detectado'} • {chat.statusText ?? 'Chat ativo'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="szp-empty">
                    Abra um chat no WhatsApp Web para sincronizar o contato e liberar a visao premium do CRM.
                  </div>
                )}
              </div>

              {contact ? (
                <>
                  <div className="szp-card">
                    <div className="szp-row szp-between">
                      <div>
                        <p className="szp-section-title">Perfil CRM</p>
                        <strong>{contact.name}</strong>
                        <p className="szp-muted">{contact.phone ?? contact.email ?? 'Contato sem telefone ou e-mail'}</p>
                      </div>
                      <span className="szp-pill">{contact.stage.name}</span>
                    </div>

                    <label className="szp-block-field">
                      Stage
                      <select
                        value={contact.stage.id}
                        onChange={async (event) => {
                          await api.moveContact({ contactId: contact.id, targetStageId: event.target.value })
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
                        <Sparkles size={16} />
                        <p className="szp-section-title">Assistente IA</p>
                      </div>
                      {visibleAiReplySource ? (
                        <span className={`szp-pill ${visibleAiReplySource === 'openrouter' ? 'is-accent' : ''}`}>
                          {visibleAiReplySource === 'openrouter' ? 'IA real' : 'Fallback'}
                        </span>
                      ) : null}
                    </div>
                    <p className="szp-muted">
                      Usa o contexto do chat aberto e o CRM para sugerir uma resposta pronta para envio.
                    </p>
                    <button className="szp-primary" onClick={suggestReplyWithAi} disabled={!chat || aiLoading}>
                      <Sparkles size={14} />
                      {aiLoading ? 'Gerando resposta...' : 'Sugerir resposta com IA'}
                    </button>
                    {aiLoading ? <div className="szp-skeleton szp-skeleton-md" /> : null}
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
                            style={active ? { backgroundColor: tag.color, color: '#071015' } : undefined}
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
                    <div className="szp-list">
                      {quickReplies.map((quickReply) => (
                        <button key={quickReply.id} className="szp-list-item" onClick={() => applyQuickReply(quickReply)}>
                          <div>
                            <strong>{quickReply.title}</strong>
                            <p>{quickReply.shortcut} • {quickReply.body.slice(0, 86)}...</p>
                          </div>
                          <ExternalLink size={14} />
                        </button>
                      ))}
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
                              {note.pinned ? <span className="szp-pill">Fixada</span> : null}
                            </div>
                            <p>{note.body}</p>
                          </div>
                        ))
                      ) : (
                        <div className="szp-empty">Sem notas ainda para este contato.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="szp-card">
                  <div className="szp-empty">
                    O contato detectado sera criado ou sincronizado automaticamente assim que a API estiver conectada.
                  </div>
                </div>
              )}

              <div className="szp-card">
                <p className="szp-section-title">Sessao</p>
                <p className="szp-muted">{session?.user.email ?? 'Conectado'}</p>
                <button
                  className="szp-secondary"
                  onClick={async () => {
                    setToken(null)
                    setSession(null)
                    setContact(null)
                    await setStoredSession(apiUrl, null)
                    showFeedback('Sessao encerrada.', 'neutral')
                  }}
                >
                  Sair da extensao
                </button>
              </div>
            </>
          ) : null}

          {feedback ? <div className={`szp-feedback is-${feedback.tone}`}>{feedback.message}</div> : null}
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
