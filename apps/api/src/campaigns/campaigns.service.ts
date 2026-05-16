import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
  ) {}

  async list(salonId: string) {
    return this.prisma.campaign.findMany({
      where: { salonId },
      orderBy: [{ scheduledFor: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(salonId: string, userId: string, payload: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        salonId,
        title: payload.title,
        message: payload.message,
        audience: payload.audience,
        scheduledFor: payload.scheduledFor
          ? new Date(payload.scheduledFor)
          : null,
        status: payload.status ?? 'DRAFT',
      },
    });

    await this.activityLogService.record({
      salonId,
      userId,
      entityType: 'campaign',
      entityId: campaign.id,
      action: 'created',
      title: 'Campanha criada',
      description: `${campaign.title} foi criada com status ${translateCampaignStatus(campaign.status)}.`,
      metadata: {
        status: campaign.status,
        audience: campaign.audience,
        scheduledFor: campaign.scheduledFor?.toISOString() ?? null,
      },
    });

    return campaign;
  }

  async update(
    salonId: string,
    userId: string,
    campaignId: string,
    payload: UpdateCampaignDto,
  ) {
    await this.ensureCampaign(salonId, campaignId);

    const campaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.message !== undefined ? { message: payload.message } : {}),
        ...(payload.audience !== undefined
          ? { audience: payload.audience }
          : {}),
        ...(payload.scheduledFor !== undefined
          ? {
              scheduledFor: payload.scheduledFor
                ? new Date(payload.scheduledFor)
                : null,
            }
          : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
      },
    });

    await this.activityLogService.record({
      salonId,
      userId,
      entityType: 'campaign',
      entityId: campaign.id,
      action: 'updated',
      title: 'Campanha atualizada',
      description: `${campaign.title} foi atualizada e esta ${translateCampaignStatus(campaign.status)}.`,
      metadata: {
        status: campaign.status,
        audience: campaign.audience,
        scheduledFor: campaign.scheduledFor?.toISOString() ?? null,
      },
    });

    return campaign;
  }

  async remove(salonId: string, userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, salonId },
      select: {
        id: true,
        title: true,
      },
    });

    const result = await this.prisma.campaign.deleteMany({
      where: { id: campaignId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Campanha não encontrada.');
    }

    if (campaign) {
      await this.activityLogService.record({
        salonId,
        userId,
        entityType: 'campaign',
        entityId: campaign.id,
        action: 'deleted',
        title: 'Campanha removida',
        description: `${campaign.title} foi removida da operacao.`,
      });
    }

    return { success: true as const };
  }

  private async ensureCampaign(salonId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, salonId },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada.');
    }
  }
}

function translateCampaignStatus(
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'PAUSED',
) {
  switch (status) {
    case 'DRAFT':
      return 'em rascunho';
    case 'SCHEDULED':
      return 'agendada';
    case 'SENT':
      return 'enviada';
    case 'PAUSED':
      return 'pausada';
  }
}
