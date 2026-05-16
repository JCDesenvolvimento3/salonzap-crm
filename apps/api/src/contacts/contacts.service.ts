import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  contactDetailInclude,
  contactSummaryInclude,
  type ContactSummaryRecord,
  serializeContactDetail,
  serializeContactSummary,
} from '../common/prisma/serializers';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListRecoveryCandidatesDto } from './dto/list-recovery-candidates.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { SyncWhatsappContactDto } from './dto/sync-whatsapp-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
  ) {}

  async list(salonId: string, query?: string, stageId?: string) {
    const contacts = await this.prisma.contact.findMany({
      where: {
        salonId,
        ...(stageId ? { stageId } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { whatsappName: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: contactSummaryInclude,
      orderBy: [{ lastInteractionAt: 'desc' }, { createdAt: 'desc' }],
    });

    return contacts.map(serializeContactSummary);
  }

  async detail(salonId: string, contactId: string) {
    const [contact, activities] = await Promise.all([
      this.prisma.contact.findFirst({
        where: { id: contactId, salonId },
        include: contactDetailInclude,
      }),
      this.activityLogService.listByEntity(salonId, 'contact', contactId, 20),
    ]);

    if (!contact) {
      throw new NotFoundException('Contato não encontrado.');
    }

    return {
      ...serializeContactDetail(contact),
      activities,
    };
  }

  async listRecoveryCandidates(
    salonId: string,
    query: ListRecoveryCandidatesDto,
  ) {
    const daysInactive = query.daysInactive ?? 45;
    const limit = query.limit ?? 25;
    const cutoff = new Date(Date.now() - daysInactive * 86_400_000);

    const contacts = await this.prisma.contact.findMany({
      where: {
        salonId,
        phone: {
          not: null,
        },
      },
      include: contactSummaryInclude,
      orderBy: [{ lastInteractionAt: 'asc' }, { createdAt: 'asc' }],
      take: Math.min(limit * 4, 200),
    });

    return contacts
      .map((contact) => this.serializeRecoveryCandidate(contact))
      .filter((candidate) => candidate.lastTouchAt <= cutoff)
      .slice(0, limit);
  }

  async create(salonId: string, userId: string, payload: CreateContactDto) {
    const stageId = payload.stageId ?? (await this.getDefaultStageId(salonId));
    await this.ensureStageBelongsToSalon(salonId, stageId);
    await this.ensureTagsBelongToSalon(salonId, payload.tagIds);

    const contact = await this.prisma.contact.create({
      data: {
        salonId,
        stageId,
        name: payload.name,
        phone: emptyToNull(payload.phone),
        email: emptyToNull(payload.email),
        city: emptyToNull(payload.city),
        source: payload.source?.trim() || 'Manual',
        statusText: emptyToNull(payload.statusText),
        avatarUrl: emptyToNull(payload.avatarUrl),
        whatsappName: emptyToNull(payload.whatsappName),
        lastInteractionAt: new Date(),
        tags: payload.tagIds?.length
          ? {
              createMany: {
                data: payload.tagIds.map((tagId) => ({ tagId })),
              },
            }
          : undefined,
      },
      include: contactSummaryInclude,
    });

    await this.activityLogService.record({
      salonId,
      userId,
      entityType: 'contact',
      entityId: contact.id,
      action: 'created',
      title: 'Contato cadastrado',
      description: `${contact.name} entrou no CRM pela origem ${contact.source}.`,
      metadata: {
        stageId: contact.stage.id,
        stageName: contact.stage.name,
        tags: contact.tags.map(({ tag }) => tag.name),
      },
    });

    return serializeContactSummary(contact);
  }

  async update(
    salonId: string,
    userId: string,
    contactId: string,
    payload: UpdateContactDto,
  ) {
    await this.ensureContactExists(salonId, contactId);

    if (payload.stageId) {
      await this.ensureStageBelongsToSalon(salonId, payload.stageId);
    }

    if (payload.tagIds) {
      await this.ensureTagsBelongToSalon(salonId, payload.tagIds);
    }

    const contact = await this.prisma.$transaction(async (tx) => {
      if (payload.tagIds) {
        await tx.contactTag.deleteMany({
          where: { contactId },
        });

        if (payload.tagIds.length) {
          await tx.contactTag.createMany({
            data: payload.tagIds.map((tagId) => ({
              contactId,
              tagId,
            })),
          });
        }
      }

      return tx.contact.update({
        where: { id: contactId },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.phone !== undefined
            ? { phone: emptyToNull(payload.phone) }
            : {}),
          ...(payload.email !== undefined
            ? { email: emptyToNull(payload.email) }
            : {}),
          ...(payload.city !== undefined
            ? { city: emptyToNull(payload.city) }
            : {}),
          ...(payload.source !== undefined
            ? { source: payload.source || 'Manual' }
            : {}),
          ...(payload.statusText !== undefined
            ? { statusText: emptyToNull(payload.statusText) }
            : {}),
          ...(payload.avatarUrl !== undefined
            ? { avatarUrl: emptyToNull(payload.avatarUrl) }
            : {}),
          ...(payload.whatsappName !== undefined
            ? { whatsappName: emptyToNull(payload.whatsappName) }
            : {}),
          ...(payload.stageId !== undefined
            ? { stageId: payload.stageId }
            : {}),
          lastInteractionAt: new Date(),
        },
        include: contactSummaryInclude,
      });
    });

    await this.activityLogService.record({
      salonId,
      userId,
      entityType: 'contact',
      entityId: contact.id,
      action: 'updated',
      title: 'Contato atualizado',
      description: `${contact.name} teve dados comerciais atualizados.`,
      metadata: {
        stageId: contact.stage.id,
        stageName: contact.stage.name,
        tags: contact.tags.map(({ tag }) => tag.name),
      },
    });

    return serializeContactSummary(contact);
  }

  async remove(salonId: string, userId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, salonId },
      select: {
        id: true,
        name: true,
      },
    });

    const result = await this.prisma.contact.deleteMany({
      where: { id: contactId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Contato não encontrado.');
    }

    if (contact) {
      await this.activityLogService.record({
        salonId,
        userId,
        entityType: 'contact',
        entityId: contact.id,
        action: 'deleted',
        title: 'Contato removido',
        description: `${contact.name} foi removido do CRM.`,
      });
    }

    return { success: true as const };
  }

  async syncFromWhatsapp(
    salonId: string,
    userId: string,
    payload: SyncWhatsappContactDto,
  ) {
    const normalizedName = payload.displayName.trim();
    const normalizedPhone = payload.phone?.trim() || null;

    const existing = await this.prisma.contact.findFirst({
      where: {
        salonId,
        OR: [
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          { name: { equals: normalizedName, mode: 'insensitive' } },
          { whatsappName: { equals: normalizedName, mode: 'insensitive' } },
        ],
      },
      include: contactDetailInclude,
    });

    if (existing) {
      const updated = await this.prisma.contact.update({
        where: { id: existing.id },
        data: {
          phone: normalizedPhone ?? existing.phone,
          whatsappName: normalizedName,
          avatarUrl: payload.avatarUrl?.trim() || existing.avatarUrl,
          statusText: payload.statusText?.trim() || existing.statusText,
          lastInteractionAt: new Date(),
        },
        include: contactDetailInclude,
      });

      await this.activityLogService.record({
        salonId,
        userId,
        entityType: 'contact',
        entityId: updated.id,
        action: 'synced_from_whatsapp',
        title: 'Contato sincronizado do WhatsApp',
        description: `${updated.name} teve os dados atualizados a partir do WhatsApp Web.`,
        metadata: {
          phone: updated.phone,
          whatsappName: updated.whatsappName,
        },
      });

      return serializeContactDetail(updated);
    }

    const stageId = await this.getDefaultStageId(salonId);
    const created = await this.prisma.contact.create({
      data: {
        salonId,
        stageId,
        name: normalizedName,
        phone: normalizedPhone,
        whatsappName: normalizedName,
        avatarUrl: payload.avatarUrl?.trim() || null,
        statusText: payload.statusText?.trim() || 'Capturado do WhatsApp Web',
        source: 'WhatsApp Web',
        lastInteractionAt: new Date(),
      },
      include: contactDetailInclude,
    });

    await this.activityLogService.record({
      salonId,
      userId,
      entityType: 'contact',
      entityId: created.id,
      action: 'captured_from_whatsapp',
      title: 'Contato capturado do WhatsApp',
      description: `${created.name} foi criado a partir da conversa aberta no WhatsApp Web.`,
      metadata: {
        phone: created.phone,
        stageId: created.stage.id,
        stageName: created.stage.name,
      },
    });

    return serializeContactDetail(created);
  }

  private async getDefaultStageId(salonId: string) {
    const stage = await this.prisma.stage.findFirst({
      where: { salonId },
      orderBy: { order: 'asc' },
    });

    if (!stage) {
      throw new BadRequestException('Nenhuma coluna do funil foi configurada.');
    }

    return stage.id;
  }

  private async ensureStageBelongsToSalon(salonId: string, stageId: string) {
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId, salonId },
    });

    if (!stage) {
      throw new BadRequestException('Coluna do funil inválida.');
    }
  }

  private async ensureTagsBelongToSalon(salonId: string, tagIds?: string[]) {
    if (!tagIds) {
      return;
    }

    const count = await this.prisma.tag.count({
      where: {
        salonId,
        id: { in: tagIds },
      },
    });

    if (count !== tagIds.length) {
      throw new BadRequestException('Uma ou mais tags são inválidas.');
    }
  }

  private async ensureContactExists(salonId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, salonId },
    });

    if (!contact) {
      throw new NotFoundException('Contato não encontrado.');
    }
  }

  private serializeRecoveryCandidate(contact: ContactSummaryRecord) {
    const referenceDate =
      contact.lastInteractionAt ?? contact.updatedAt ?? contact.createdAt;
    const now = Date.now();
    const daysWithoutReply = Math.max(
      0,
      Math.floor((now - referenceDate.getTime()) / 86_400_000),
    );

    return {
      ...serializeContactSummary(contact),
      lastTouchAt: referenceDate,
      daysWithoutReply,
      recommendedAction:
        daysWithoutReply >= 60
          ? 'reativar_com_oferta'
          : daysWithoutReply >= 45
            ? 'retomar_conversa'
            : 'follow_up_leve',
    };
  }
}

function emptyToNull(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
