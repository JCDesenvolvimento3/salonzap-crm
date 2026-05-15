import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(salonId: string) {
    return this.prisma.campaign.findMany({
      where: { salonId },
      orderBy: [{ scheduledFor: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(salonId: string, payload: CreateCampaignDto) {
    return this.prisma.campaign.create({
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
  }

  async update(
    salonId: string,
    campaignId: string,
    payload: UpdateCampaignDto,
  ) {
    await this.ensureCampaign(salonId, campaignId);

    return this.prisma.campaign.update({
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
  }

  async remove(salonId: string, campaignId: string) {
    const result = await this.prisma.campaign.deleteMany({
      where: { id: campaignId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Campanha não encontrada.');
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
