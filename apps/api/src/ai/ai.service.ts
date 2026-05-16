import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiLogType, Prisma } from '@prisma/client';
import { ActivityLogService } from '../common/services/activity-log.service';
import { contactDetailInclude } from '../common/prisma/serializers';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateCampaignDto } from './dto/generate-campaign.dto';
import { GenerateReactivationMessageDto } from './dto/generate-reactivation-message.dto';
import { IdentifyIntentDto } from './dto/identify-intent.dto';
import { SuggestReplyDto } from './dto/suggest-reply.dto';
import { SummarizeConversationDto } from './dto/summarize-conversation.dto';
import { OpenRouterService } from './openrouter.service';

type AiMeta = {
  source: 'openrouter' | 'fallback';
  fallbackUsed: boolean;
  model: string;
  logId: string | null;
};

type ReplyResult = AiMeta & {
  reply: string;
  tone: string;
};

type SummaryResult = AiMeta & {
  summary: string;
  nextStep: string;
  sentiment: 'positive' | 'neutral' | 'negative';
};

type IntentResult = AiMeta & {
  intent: string;
  confidence: 'low' | 'medium' | 'high';
  rationale: string;
};

type CampaignResult = AiMeta & {
  title: string;
  audience: string;
  message: string;
};

type ReactivationResult = AiMeta & {
  headline: string;
  message: string;
  reason: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OpenRouterService)
    private readonly openRouterService: OpenRouterService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
  ) {}

  async suggestReply(
    user: RequestUser,
    payload: SuggestReplyDto,
  ): Promise<ReplyResult> {
    const [salon, contact] = await Promise.all([
      this.getSalonContext(user.salonId),
      this.getContactContext(user.salonId, payload.contactId),
    ]);

    const customerName =
      payload.customerName?.trim() ||
      contact?.name ||
      contact?.whatsappName ||
      'cliente';
    const conversation = sanitizeConversation(payload.conversation);
    const fallback = this.buildReplyFallback(
      customerName,
      conversation,
      payload.goal,
    );

    return this.runTask<ReplyResult>({
      user,
      type: AiLogType.SUGGEST_REPLY,
      contactId: contact?.id ?? null,
      requestPayload: payload,
      fallback,
      messages: [
        {
          role: 'system',
          content:
            'Voce e um assistente comercial de um salao que responde clientes no WhatsApp em PT-BR. ' +
            'Seja cordial, objetivo, consultivo e humano. Nao invente precos, horarios ou politicas. ' +
            'Responda sempre em JSON valido com as chaves "reply" e "tone".',
        },
        {
          role: 'user',
          content: [
            `Salao: ${salon.name}`,
            salon.welcomeMessage
              ? `Mensagem institucional: ${salon.welcomeMessage}`
              : null,
            contact ? this.buildContactPromptBlock(contact) : null,
            payload.goal ? `Objetivo comercial: ${payload.goal}` : null,
            `Nome do cliente: ${customerName}`,
            'Contexto da conversa:',
            conversation,
            'Gere uma resposta pronta para enviar no WhatsApp. Mantenha entre 2 e 5 frases.',
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
      maxTokens: 260,
      temperature: 0.45,
      parse: (content) => {
        const parsed = parseJsonObject(content);
        const reply = readNonEmptyString(parsed.reply);
        const tone = readNonEmptyString(parsed.tone) || 'consultivo';

        if (!reply) {
          throw new Error('AI reply payload is missing the reply field.');
        }

        return {
          reply,
          tone,
        };
      },
    });
  }

  async summarizeConversation(
    user: RequestUser,
    payload: SummarizeConversationDto,
  ): Promise<SummaryResult> {
    const [salon, contact] = await Promise.all([
      this.getSalonContext(user.salonId),
      this.getContactContext(user.salonId, payload.contactId),
    ]);
    const conversation = sanitizeConversation(payload.conversation);
    const fallback = this.buildSummaryFallback(conversation);

    return this.runTask<SummaryResult>({
      user,
      type: AiLogType.SUMMARIZE_CONVERSATION,
      contactId: contact?.id ?? null,
      requestPayload: payload,
      fallback,
      messages: [
        {
          role: 'system',
          content:
            'Voce resume conversas comerciais de um salao em PT-BR. ' +
            'Retorne somente JSON valido com "summary", "nextStep" e "sentiment". ' +
            'Use "sentiment" apenas com os valores positive, neutral ou negative.',
        },
        {
          role: 'user',
          content: [
            `Salao: ${salon.name}`,
            contact ? this.buildContactPromptBlock(contact) : null,
            'Conversa para resumir:',
            conversation,
            'Resuma em ate 3 frases e sugira um proximo passo comercial realista.',
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
      maxTokens: 260,
      temperature: 0.2,
      parse: (content) => {
        const parsed = parseJsonObject(content);
        const summary = readNonEmptyString(parsed.summary);
        const nextStep = readNonEmptyString(parsed.nextStep);
        const sentiment = normalizeSentiment(parsed.sentiment);

        if (!summary || !nextStep || !sentiment) {
          throw new Error('AI summary payload is incomplete.');
        }

        return {
          summary,
          nextStep,
          sentiment,
        };
      },
    });
  }

  async identifyIntent(
    user: RequestUser,
    payload: IdentifyIntentDto,
  ): Promise<IntentResult> {
    const [salon, contact] = await Promise.all([
      this.getSalonContext(user.salonId),
      this.getContactContext(user.salonId, payload.contactId),
    ]);
    const conversation = sanitizeConversation(payload.conversation);
    const fallback = this.buildIntentFallback(conversation);

    return this.runTask<IntentResult>({
      user,
      type: AiLogType.IDENTIFY_INTENT,
      contactId: contact?.id ?? null,
      requestPayload: payload,
      fallback,
      messages: [
        {
          role: 'system',
          content:
            'Voce classifica a intencao principal de clientes de um salao no WhatsApp. ' +
            'Retorne somente JSON valido com "intent", "confidence" e "rationale". ' +
            'Use confidence apenas com os valores low, medium ou high. ' +
            'Prefira intencoes curtas em snake_case.',
        },
        {
          role: 'user',
          content: [
            `Salao: ${salon.name}`,
            contact ? this.buildContactPromptBlock(contact) : null,
            'Conversa para classificar:',
            conversation,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
      maxTokens: 180,
      temperature: 0.15,
      parse: (content) => {
        const parsed = parseJsonObject(content);
        const intent = readNonEmptyString(parsed.intent);
        const confidence = normalizeConfidence(parsed.confidence);
        const rationale = readNonEmptyString(parsed.rationale);

        if (!intent || !confidence || !rationale) {
          throw new Error('AI intent payload is incomplete.');
        }

        return {
          intent,
          confidence,
          rationale,
        };
      },
    });
  }

  async generateCampaign(
    user: RequestUser,
    payload: GenerateCampaignDto,
  ): Promise<CampaignResult> {
    const salon = await this.getSalonContext(user.salonId);
    const fallback = this.buildCampaignFallback(payload);

    return this.runTask<CampaignResult>({
      user,
      type: AiLogType.GENERATE_CAMPAIGN,
      contactId: null,
      requestPayload: payload,
      fallback,
      messages: [
        {
          role: 'system',
          content:
            'Voce cria campanhas de WhatsApp para um salao em PT-BR. ' +
            'Retorne somente JSON valido com "title", "audience" e "message". ' +
            'Mantenha o texto persuasivo, curto e pronto para envio, sem promessas irreais.',
        },
        {
          role: 'user',
          content: [
            `Salao: ${salon.name}`,
            salon.welcomeMessage
              ? `Tom institucional: ${salon.welcomeMessage}`
              : null,
            payload.objective ? `Objetivo: ${payload.objective}` : null,
            payload.audienceHint
              ? `Audiencia sugerida: ${payload.audienceHint}`
              : null,
            `Brief: ${payload.prompt.trim()}`,
            'Gere uma campanha objetiva para WhatsApp com titulo, audiencia e mensagem.',
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
      maxTokens: 320,
      temperature: 0.55,
      parse: (content) => {
        const parsed = parseJsonObject(content);
        const title = readNonEmptyString(parsed.title);
        const audience = readNonEmptyString(parsed.audience);
        const message = readNonEmptyString(parsed.message);

        if (!title || !audience || !message) {
          throw new Error('AI campaign payload is incomplete.');
        }

        return {
          title,
          audience,
          message,
        };
      },
    });
  }

  async generateReactivationMessage(
    user: RequestUser,
    payload: GenerateReactivationMessageDto,
  ): Promise<ReactivationResult> {
    const [salon, contact] = await Promise.all([
      this.getSalonContext(user.salonId),
      this.getContactContext(user.salonId, payload.contactId),
    ]);

    if (!contact) {
      throw new NotFoundException('Contato nao encontrado para reativacao.');
    }

    const daysInactive = payload.daysInactive ?? inferDaysInactive(contact);
    const result = await this.suggestReply(user, {
      contactId: contact.id,
      customerName: contact.name,
      conversation: [
        `Salao: ${salon.name}`,
        salon.welcomeMessage
          ? `Tom institucional: ${salon.welcomeMessage}`
          : null,
        this.buildContactPromptBlock(contact),
        `Cliente sem resposta ou novo agendamento ha aproximadamente ${daysInactive} dias.`,
        contact.phone ? `Telefone do cliente: ${contact.phone}` : null,
        'Contexto: o objetivo e retomar a conversa com tom humano, leve e comercialmente elegante no WhatsApp.',
      ]
        .filter(Boolean)
        .join('\n\n'),
      goal:
        payload.objective?.trim() ||
        'Gerar uma mensagem curta de reativacao para trazer o cliente de volta ao salao, sem parecer automatica',
    });

    return {
      source: result.source,
      fallbackUsed: result.fallbackUsed,
      model: result.model,
      logId: result.logId,
      headline:
        daysInactive >= 60
          ? 'Reativacao com urgencia comercial'
          : 'Reativacao de cliente',
      message: result.reply,
      reason: result.fallbackUsed
        ? 'Mensagem montada pelo fallback seguro com base no tempo sem contato e no contexto do CRM.'
        : `Mensagem gerada pela IA real com foco em reengajar o cliente apos ${daysInactive} dias sem retorno.`,
    };
  }

  private async runTask<T extends AiMeta>({
    user,
    type,
    contactId,
    requestPayload,
    fallback,
    messages,
    maxTokens,
    temperature,
    parse,
  }: {
    user: RequestUser;
    type: AiLogType;
    contactId: string | null;
    requestPayload: unknown;
    fallback: Omit<T, keyof AiMeta>;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    maxTokens: number;
    temperature: number;
    parse: (content: string) => Omit<T, keyof AiMeta>;
  }): Promise<T> {
    const defaultModel = this.openRouterService.getDefaultModel();

    try {
      const completion = await this.openRouterService.createJsonCompletion({
        messages,
        maxTokens,
        temperature,
        sessionId: `${user.salonId}:${type}:${contactId ?? 'general'}`,
        metadata: {
          task: type,
          salonId: user.salonId,
          userId: user.id,
        },
      });

      const parsed = parse(completion.content);
      const logId = await this.createLog({
        salonId: user.salonId,
        userId: user.id,
        contactId,
        type,
        model: completion.model,
        requestPayload,
        responsePayload: {
          content: completion.content,
          parsed,
          raw: completion.payload,
        },
        success: true,
        fallbackUsed: false,
      });

      await this.activityLogService.record({
        salonId: user.salonId,
        userId: user.id,
        entityType: contactId ? 'contact' : 'ai',
        entityId: contactId,
        action: 'ai_success',
        title: getAiActivityTitle(type, false),
        description: getAiActivityDescription(type, false),
        metadata: {
          aiLogId: logId,
          type,
          model: completion.model,
          fallbackUsed: false,
        },
      });

      return {
        ...parsed,
        source: 'openrouter',
        fallbackUsed: false,
        model: completion.model,
        logId,
      } as T;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'OpenRouter request failed unexpectedly.';
      this.logger.warn(`${type} failed, returning fallback: ${message}`);

      const logId = await this.createLog({
        salonId: user.salonId,
        userId: user.id,
        contactId,
        type,
        model: defaultModel,
        requestPayload,
        responsePayload: fallback,
        success: false,
        fallbackUsed: true,
        errorMessage: message,
      });

      await this.activityLogService.record({
        salonId: user.salonId,
        userId: user.id,
        entityType: contactId ? 'contact' : 'ai',
        entityId: contactId,
        action: 'ai_fallback',
        title: getAiActivityTitle(type, true),
        description: getAiActivityDescription(type, true),
        metadata: {
          aiLogId: logId,
          type,
          model: defaultModel,
          fallbackUsed: true,
          errorMessage: message,
        },
      });

      return {
        ...fallback,
        source: 'fallback',
        fallbackUsed: true,
        model: defaultModel,
        logId,
      } as T;
    }
  }

  private async createLog({
    salonId,
    userId,
    contactId,
    type,
    model,
    requestPayload,
    responsePayload,
    success,
    fallbackUsed,
    errorMessage,
  }: {
    salonId: string;
    userId: string;
    contactId: string | null;
    type: AiLogType;
    model: string;
    requestPayload: unknown;
    responsePayload: unknown;
    success: boolean;
    fallbackUsed: boolean;
    errorMessage?: string;
  }) {
    try {
      const record = await this.prisma.aiLog.create({
        data: {
          salonId,
          userId,
          contactId,
          type,
          provider: 'openrouter',
          model,
          request: toJsonValue(requestPayload),
          response: toJsonValue(responsePayload),
          success,
          fallbackUsed,
          ...(errorMessage ? { errorMessage } : {}),
        },
      });

      return record.id;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown database error while saving AiLog.';
      this.logger.error(`Could not persist AiLog: ${message}`);
      return null;
    }
  }

  private async getSalonContext(salonId: string) {
    return this.prisma.salon.findUniqueOrThrow({
      where: { id: salonId },
      select: {
        id: true,
        name: true,
        welcomeMessage: true,
      },
    });
  }

  private async getContactContext(salonId: string, contactId?: string) {
    if (!contactId?.trim()) {
      return null;
    }

    return this.prisma.contact.findFirst({
      where: {
        id: contactId,
        salonId,
      },
      include: contactDetailInclude,
    });
  }

  private buildContactPromptBlock(
    contact: NonNullable<Awaited<ReturnType<AiService['getContactContext']>>>,
  ) {
    const tags = contact.tags.map(({ tag }) => tag.name).join(', ');
    const recentNotes = contact.notes
      .slice(0, 3)
      .map((note) => note.body)
      .join(' | ');

    return [
      `Contato CRM: ${contact.name}`,
      `Stage atual: ${contact.stage.name}`,
      contact.statusText ? `Status comercial: ${contact.statusText}` : null,
      tags ? `Tags: ${tags}` : null,
      recentNotes ? `Notas recentes: ${recentNotes}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildReplyFallback(
    customerName: string,
    conversation: string,
    goal?: string,
  ) {
    const normalized = conversation.toLowerCase();
    const prefix =
      customerName && customerName !== 'cliente'
        ? `Oi, ${customerName}! `
        : 'Oi! ';

    if (
      normalized.includes('preco') ||
      normalized.includes('orcamento') ||
      normalized.includes('valor')
    ) {
      return {
        reply:
          `${prefix}Posso te passar as opcoes e te orientar no melhor formato para o que voce busca. ` +
          'Se quiser, eu organizo tudo e ja te encaminho a proposta mais adequada.',
        tone: 'consultivo',
      };
    }

    if (
      normalized.includes('horario') ||
      normalized.includes('agenda') ||
      normalized.includes('dispon')
    ) {
      return {
        reply:
          `${prefix}Consigo verificar os melhores horarios para voce. ` +
          'Me confirma sua preferencia de dia ou periodo que eu te retorno com as opcoes mais viaveis.',
        tone: 'agendamento',
      };
    }

    if (normalized.includes('remar') || normalized.includes('cancel')) {
      return {
        reply:
          `${prefix}Sem problema, eu posso te ajudar com isso. ` +
          'Me diz qual seria a melhor nova opcao de dia ou horario para seguirmos.',
        tone: 'suporte',
      };
    }

    return {
      reply:
        `${prefix}${goal?.trim() ? `${goal.trim()}. ` : ''}` +
        'Posso te orientar daqui e deixar tudo mais simples. ' +
        'Se me confirmar o que voce precisa agora, eu te respondo com a melhor proxima opcao.',
      tone: 'acolhedor',
    };
  }

  private buildSummaryFallback(conversation: string) {
    const excerpt = conversation.slice(0, 220).trim();

    return {
      summary:
        excerpt.length > 0
          ? `Resumo inicial da conversa: ${excerpt}${conversation.length > 220 ? '...' : ''}`
          : 'Conversa recebida, mas sem detalhes suficientes para resumir melhor.',
      nextStep: inferNextStep(conversation),
      sentiment: inferSentiment(conversation),
    };
  }

  private buildIntentFallback(conversation: string) {
    const normalized = conversation.toLowerCase();

    if (normalized.includes('remar') || normalized.includes('cancel')) {
      return {
        intent: 'reschedule_or_cancellation',
        confidence: 'medium' as const,
        rationale: 'A conversa menciona remarcar ou cancelar um atendimento.',
      };
    }

    if (
      normalized.includes('preco') ||
      normalized.includes('orcamento') ||
      normalized.includes('valor')
    ) {
      return {
        intent: 'price_quote',
        confidence: 'medium' as const,
        rationale: 'A conversa indica pedido de preco, valor ou orcamento.',
      };
    }

    if (
      normalized.includes('horario') ||
      normalized.includes('agenda') ||
      normalized.includes('dispon')
    ) {
      return {
        intent: 'booking',
        confidence: 'medium' as const,
        rationale:
          'A conversa indica interesse em disponibilidade ou agendamento.',
      };
    }

    return {
      intent: 'general_support',
      confidence: 'low' as const,
      rationale:
        'Nao houve sinal suficiente para uma classificacao mais precisa.',
    };
  }

  private buildCampaignFallback(payload: GenerateCampaignDto) {
    const prompt = payload.prompt.trim();
    const titleBase = titleCase(
      payload.objective?.trim() ||
        prompt.split(/[.!?\n]/)[0]?.slice(0, 48) ||
        'Campanha de relacionamento',
    );

    return {
      title: titleBase,
      audience:
        payload.audienceHint?.trim() ||
        'Base ativa para relacionamento e reengajamento',
      message:
        `Oi! Aqui e da equipe SalonZap. ${payload.objective?.trim() ? `${payload.objective.trim()}. ` : ''}` +
        `Preparamos uma acao especial com base neste foco: ${prompt}. ` +
        'Se fizer sentido para voce, me responde aqui que eu te passo os detalhes e os melhores horarios.',
    };
  }

  private buildReactivationFallback(
    customerName: string,
    daysInactive: number,
  ) {
    const safeName = customerName.trim() || 'cliente';

    return {
      headline: 'Reativacao de cliente',
      message:
        `Oi, ${safeName}! Tudo bem? Faz cerca de ${daysInactive} dias desde nosso ultimo contato. ` +
        'Quis passar aqui para saber se voce quer retomar seus cuidados e te ajudar a encontrar a melhor opcao para voltar ao salao.',
      reason:
        'Mensagem acolhedora com foco em retomar a conversa sem parecer automatica ou agressiva.',
    };
  }
}

function getAiActivityTitle(type: AiLogType, fallbackUsed: boolean) {
  const suffix = fallbackUsed ? ' com fallback' : '';

  switch (type) {
    case AiLogType.SUGGEST_REPLY:
      return `IA gerou sugestao de resposta${suffix}`;
    case AiLogType.SUMMARIZE_CONVERSATION:
      return `IA resumiu a conversa${suffix}`;
    case AiLogType.GENERATE_CAMPAIGN:
      return `IA montou campanha${suffix}`;
    case AiLogType.IDENTIFY_INTENT:
      return `IA identificou a intencao${suffix}`;
  }
}

function getAiActivityDescription(type: AiLogType, fallbackUsed: boolean) {
  const mode = fallbackUsed ? 'usando o fallback seguro' : 'com resposta real';

  switch (type) {
    case AiLogType.SUGGEST_REPLY:
      return `Uma sugestao de resposta foi gerada ${mode}.`;
    case AiLogType.SUMMARIZE_CONVERSATION:
      return `O resumo da conversa foi produzido ${mode}.`;
    case AiLogType.GENERATE_CAMPAIGN:
      return `Uma campanha foi gerada ${mode}.`;
    case AiLogType.IDENTIFY_INTENT:
      return `A intencao do cliente foi classificada ${mode}.`;
  }
}

function sanitizeConversation(value: string) {
  return value
    .trim()
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 6000);
}

function parseJsonObject(content: string) {
  const normalized = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  const parsed = JSON.parse(normalized) as Record<string, unknown>;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI response is not a JSON object.');
  }

  return parsed;
}

function readNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeSentiment(
  value: unknown,
): 'positive' | 'neutral' | 'negative' | null {
  if (value === 'positive' || value === 'neutral' || value === 'negative') {
    return value;
  }

  return null;
}

function normalizeConfidence(value: unknown): 'low' | 'medium' | 'high' | null {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }

  return null;
}

function inferNextStep(conversation: string) {
  const normalized = conversation.toLowerCase();

  if (
    normalized.includes('preco') ||
    normalized.includes('orcamento') ||
    normalized.includes('valor')
  ) {
    return 'Responder com proposta objetiva e confirmar interesse no servico ideal.';
  }

  if (
    normalized.includes('horario') ||
    normalized.includes('agenda') ||
    normalized.includes('dispon')
  ) {
    return 'Oferecer opcoes de agenda e puxar o cliente para uma confirmacao.';
  }

  if (normalized.includes('remar') || normalized.includes('cancel')) {
    return 'Checar nova disponibilidade e reduzir o atrito para remarcar.';
  }

  return 'Responder com acolhimento, esclarecer a duvida e conduzir para o proximo passo comercial.';
}

function inferSentiment(
  conversation: string,
): 'positive' | 'neutral' | 'negative' {
  const normalized = conversation.toLowerCase();

  if (
    normalized.includes('cancel') ||
    normalized.includes('reclama') ||
    normalized.includes('insatis') ||
    normalized.includes('nao gostei')
  ) {
    return 'negative';
  }

  if (
    normalized.includes('quero') ||
    normalized.includes('gostei') ||
    normalized.includes('confirm') ||
    normalized.includes('fechar')
  ) {
    return 'positive';
  }

  return 'neutral';
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(' ');
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function inferDaysInactive(
  contact: NonNullable<Awaited<ReturnType<AiService['getContactContext']>>>,
) {
  const referenceDate =
    contact.lastInteractionAt ?? contact.updatedAt ?? contact.createdAt;

  return Math.max(
    0,
    Math.floor((Date.now() - referenceDate.getTime()) / 86_400_000),
  );
}
