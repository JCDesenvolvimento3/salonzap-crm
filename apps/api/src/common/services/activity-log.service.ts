import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, type ActivityLog as PrismaActivityLog } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type RecordActivityInput = {
  salonId: string;
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(input: RecordActivityInput) {
    try {
      return await this.prisma.activityLog.create({
        data: {
          salonId: input.salonId,
          ...(input.userId ? { userId: input.userId } : {}),
          entityType: input.entityType,
          ...(input.entityId ? { entityId: input.entityId } : {}),
          action: input.action,
          title: input.title,
          description: input.description,
          ...(input.metadata ? { metadata: toJsonValue(input.metadata) } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error while persisting ActivityLog.';
      this.logger.error(`Could not persist ActivityLog: ${message}`);
      return null;
    }
  }

  async listRecentBySalon(salonId: string, limit = 10) {
    const activities = await this.prisma.activityLog.findMany({
      where: { salonId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities.map(serializeActivityLog);
  }

  async listByEntity(
    salonId: string,
    entityType: string,
    entityId: string,
    limit = 20,
  ) {
    const activities = await this.prisma.activityLog.findMany({
      where: {
        salonId,
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities.map(serializeActivityLog);
  }
}

export function serializeActivityLog(
  activity: PrismaActivityLog & {
    user?: { id: string; name: string } | null;
  },
) {
  return {
    id: activity.id,
    entityType: activity.entityType,
    entityId: activity.entityId,
    action: activity.action,
    title: activity.title,
    description: activity.description,
    metadata: activity.metadata as Record<string, unknown> | null,
    createdAt: activity.createdAt,
    user: activity.user ?? null,
  };
}

function toJsonValue(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
