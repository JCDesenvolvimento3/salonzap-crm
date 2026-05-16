import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import {
  noteInclude,
  reminderInclude,
  serializeNote,
  serializeReminder,
  serializeStage,
} from '../common/prisma/serializers';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
  ) {}

  async summary(salonId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      contactsCount,
      contactsCreatedToday,
      remindersOverdue,
      remindersToday,
      campaignsScheduled,
      campaignsSent,
      quickReplies,
      contactsThisMonth,
      stages,
      upcomingReminders,
      recentNotes,
      aiLogsTotal,
      aiUsageToday,
      aiSuccessCount,
      aiFallbackCount,
      recentActivities,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { salonId } }),
      this.prisma.contact.count({
        where: { salonId, createdAt: { gte: startOfToday, lte: endOfToday } },
      }),
      this.prisma.reminder.count({
        where: { salonId, status: 'PENDING', dueAt: { lt: startOfToday } },
      }),
      this.prisma.reminder.count({
        where: {
          salonId,
          status: 'PENDING',
          dueAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      this.prisma.campaign.count({
        where: { salonId, status: 'SCHEDULED' },
      }),
      this.prisma.campaign.count({
        where: { salonId, status: 'SENT' },
      }),
      this.prisma.quickReply.count({ where: { salonId } }),
      this.prisma.contact.count({
        where: { salonId, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.stage.findMany({
        where: { salonId },
        include: {
          _count: {
            select: { contacts: true },
          },
        },
        orderBy: { order: 'asc' },
      }),
      this.prisma.reminder.findMany({
        where: { salonId, status: 'PENDING' },
        include: reminderInclude,
        orderBy: { dueAt: 'asc' },
        take: 5,
      }),
      this.prisma.note.findMany({
        where: { salonId },
        include: noteInclude,
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      this.prisma.aiLog.count({ where: { salonId } }),
      this.prisma.aiLog.count({
        where: { salonId, createdAt: { gte: startOfToday, lte: endOfToday } },
      }),
      this.prisma.aiLog.count({
        where: { salonId, success: true },
      }),
      this.prisma.aiLog.count({
        where: { salonId, fallbackUsed: true },
      }),
      this.activityLogService.listRecentBySalon(salonId, 10),
    ]);

    const wonStage =
      stages.find((stage) => stage.slug === 'cliente') ??
      stages.find((stage) => stage.winProbability === 100) ??
      stages[stages.length - 1];
    const conversionRate = contactsCount
      ? Math.round(((wonStage?._count.contacts ?? 0) / contactsCount) * 100)
      : 0;
    const remindersDue = remindersOverdue + remindersToday;

    return {
      totals: {
        contacts: contactsCount,
        activeContacts: contactsCount,
        contactsCreatedToday,
        remindersDue,
        remindersOverdue,
        remindersToday,
        campaignsScheduled,
        campaignsSent,
        quickReplies,
        aiUsageToday,
        aiLogsTotal,
        aiSuccessCount,
        aiFallbackCount,
      },
      conversionRate,
      contactsThisMonth,
      stageDistribution: stages.map((stage) => ({
        ...serializeStage(stage),
        contactsCount: stage._count.contacts,
      })),
      recentNotes: recentNotes.map(serializeNote),
      upcomingReminders: upcomingReminders.map(serializeReminder),
      recentActivities,
      latestActivity: recentActivities[0] ?? null,
    };
  }
}
