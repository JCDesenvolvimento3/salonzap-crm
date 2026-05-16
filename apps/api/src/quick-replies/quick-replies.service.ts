import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';

@Injectable()
export class QuickRepliesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
  ) {}

  async list(salonId: string) {
    return this.prisma.quickReply.findMany({
      where: { salonId },
      orderBy: [{ category: 'asc' }, { shortcut: 'asc' }],
    });
  }

  async create(
    salonId: string,
    authorId: string,
    payload: CreateQuickReplyDto,
  ) {
    await this.ensureShortcutAvailable(salonId, payload.shortcut);

    const quickReply = await this.prisma.quickReply.create({
      data: {
        salonId,
        authorId,
        title: payload.title,
        shortcut: payload.shortcut,
        body: payload.body,
        category: payload.category?.trim() || null,
      },
    });

    await this.activityLogService.record({
      salonId,
      userId: authorId,
      entityType: 'quick_reply',
      entityId: quickReply.id,
      action: 'created',
      title: 'Resposta rapida criada',
      description: `${quickReply.title} foi adicionada a biblioteca compartilhada.`,
      metadata: {
        shortcut: quickReply.shortcut,
        category: quickReply.category,
      },
    });

    return quickReply;
  }

  async update(
    salonId: string,
    userId: string,
    quickReplyId: string,
    payload: UpdateQuickReplyDto,
  ) {
    await this.ensureQuickReply(salonId, quickReplyId);

    if (payload.shortcut) {
      await this.ensureShortcutAvailable(
        salonId,
        payload.shortcut,
        quickReplyId,
      );
    }

    const quickReply = await this.prisma.quickReply.update({
      where: { id: quickReplyId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.shortcut !== undefined
          ? { shortcut: payload.shortcut }
          : {}),
        ...(payload.body !== undefined ? { body: payload.body } : {}),
        ...(payload.category !== undefined
          ? { category: payload.category || null }
          : {}),
      },
    });

    await this.activityLogService.record({
      salonId,
      userId,
      entityType: 'quick_reply',
      entityId: quickReply.id,
      action: 'updated',
      title: 'Resposta rapida atualizada',
      description: `${quickReply.title} teve o roteiro revisado.`,
      metadata: {
        shortcut: quickReply.shortcut,
        category: quickReply.category,
      },
    });

    return quickReply;
  }

  async remove(salonId: string, userId: string, quickReplyId: string) {
    const quickReply = await this.prisma.quickReply.findFirst({
      where: { id: quickReplyId, salonId },
      select: {
        id: true,
        title: true,
      },
    });

    const result = await this.prisma.quickReply.deleteMany({
      where: { id: quickReplyId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Resposta rápida não encontrada.');
    }

    if (quickReply) {
      await this.activityLogService.record({
        salonId,
        userId,
        entityType: 'quick_reply',
        entityId: quickReply.id,
        action: 'deleted',
        title: 'Resposta rapida removida',
        description: `${quickReply.title} saiu da biblioteca compartilhada.`,
      });
    }

    return { success: true as const };
  }

  private async ensureQuickReply(salonId: string, quickReplyId: string) {
    const quickReply = await this.prisma.quickReply.findFirst({
      where: { id: quickReplyId, salonId },
    });

    if (!quickReply) {
      throw new NotFoundException('Resposta rápida não encontrada.');
    }
  }

  private async ensureShortcutAvailable(
    salonId: string,
    shortcut: string,
    ignoreId?: string,
  ) {
    const existing = await this.prisma.quickReply.findFirst({
      where: {
        salonId,
        shortcut,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Esse atalho já está em uso.');
    }
  }
}
