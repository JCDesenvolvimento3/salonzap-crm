import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';

@Injectable()
export class QuickRepliesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

    return this.prisma.quickReply.create({
      data: {
        salonId,
        authorId,
        title: payload.title,
        shortcut: payload.shortcut,
        body: payload.body,
        category: payload.category?.trim() || null,
      },
    });
  }

  async update(
    salonId: string,
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

    return this.prisma.quickReply.update({
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
  }

  async remove(salonId: string, quickReplyId: string) {
    const result = await this.prisma.quickReply.deleteMany({
      where: { id: quickReplyId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Resposta rápida não encontrada.');
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
