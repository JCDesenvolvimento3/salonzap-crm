import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  contactDetailInclude,
  contactSummaryInclude,
  serializeContactDetail,
  serializeContactSummary,
} from '../common/prisma/serializers';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { SyncWhatsappContactDto } from './dto/sync-whatsapp-contact.dto';

@Injectable()
export class ContactsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, salonId },
      include: contactDetailInclude,
    });

    if (!contact) {
      throw new NotFoundException('Contato não encontrado.');
    }

    return serializeContactDetail(contact);
  }

  async create(salonId: string, payload: CreateContactDto) {
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

    return serializeContactSummary(contact);
  }

  async update(salonId: string, contactId: string, payload: UpdateContactDto) {
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

    return serializeContactSummary(contact);
  }

  async remove(salonId: string, contactId: string) {
    const result = await this.prisma.contact.deleteMany({
      where: { id: contactId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Contato não encontrado.');
    }

    return { success: true as const };
  }

  async syncFromWhatsapp(salonId: string, payload: SyncWhatsappContactDto) {
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
}

function emptyToNull(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
