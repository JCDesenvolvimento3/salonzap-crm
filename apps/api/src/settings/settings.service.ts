import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  serializeStage,
  serializeTag,
  stageSelect,
  tagSelect,
} from '../common/prisma/serializers';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async profile(userId: string, salonId: string) {
    const [user, tags, stages] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: userId, salonId },
        include: { salon: true },
      }),
      this.prisma.tag.findMany({
        where: { salonId },
        select: tagSelect,
        orderBy: { name: 'asc' },
      }),
      this.prisma.stage.findMany({
        where: { salonId },
        select: {
          ...stageSelect,
          _count: {
            select: { contacts: true },
          },
        },
        orderBy: { order: 'asc' },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return {
      salon: {
        id: user.salon.id,
        name: user.salon.name,
        slug: user.salon.slug,
        timezone: user.salon.timezone,
        welcomeMessage: user.salon.welcomeMessage,
        brandColor: user.salon.brandColor,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        salonId: user.salonId,
      },
      tags: tags.map(serializeTag),
      stages: stages.map((stage) => ({
        ...serializeStage(stage),
        contactsCount: stage._count.contacts,
      })),
      runtime: {
        siteUrl:
          this.configService.get<string>('NEXT_PUBLIC_SITE_URL')?.trim() ||
          null,
        aiProvider: 'OpenRouter',
        aiModel:
          this.configService.get<string>('OPENROUTER_MODEL')?.trim() ||
          'deepseek/deepseek-v4-flash:free',
        aiEnabled: Boolean(
          this.configService.get<string>('OPENROUTER_API_KEY')?.trim(),
        ),
      },
    };
  }

  async update(userId: string, salonId: string, payload: UpdateSettingsDto) {
    await this.prisma.$transaction(async (tx) => {
      if (payload.userName !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { name: payload.userName },
        });
      }

      const salonData = {
        ...(payload.salonName !== undefined ? { name: payload.salonName } : {}),
        ...(payload.timezone !== undefined
          ? { timezone: payload.timezone }
          : {}),
        ...(payload.welcomeMessage !== undefined
          ? { welcomeMessage: payload.welcomeMessage || null }
          : {}),
        ...(payload.brandColor !== undefined
          ? { brandColor: payload.brandColor }
          : {}),
      };

      if (Object.keys(salonData).length) {
        await tx.salon.update({
          where: { id: salonId },
          data: salonData,
        });
      }
    });

    return this.profile(userId, salonId);
  }
}
