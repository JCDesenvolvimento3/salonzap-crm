import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  noteInclude,
  reminderInclude,
  serializeNote,
  serializeReminder,
  serializeStage,
} from '../common/prisma/serializers';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(salonId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      contacts,
      remindersDue,
      campaignsScheduled,
      quickReplies,
      contactsThisMonth,
      stages,
      recentNotes,
      upcomingReminders,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { salonId } }),
      this.prisma.reminder.count({
        where: { salonId, status: 'PENDING', dueAt: { lte: endOfToday } },
      }),
      this.prisma.campaign.count({
        where: { salonId, status: 'SCHEDULED' },
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
      this.prisma.note.findMany({
        where: { salonId },
        include: noteInclude,
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      this.prisma.reminder.findMany({
        where: { salonId, status: 'PENDING' },
        include: reminderInclude,
        orderBy: { dueAt: 'asc' },
        take: 5,
      }),
    ]);

    const wonStage =
      stages.find((stage) => stage.slug === 'cliente') ??
      stages[stages.length - 1];
    const conversionRate = contacts
      ? Math.round(((wonStage?._count.contacts ?? 0) / contacts) * 100)
      : 0;

    return {
      totals: {
        contacts,
        remindersDue,
        campaignsScheduled,
        quickReplies,
      },
      conversionRate,
      contactsThisMonth,
      stageDistribution: stages.map((stage) => ({
        ...serializeStage(stage),
        contactsCount: stage._count.contacts,
      })),
      recentNotes: recentNotes.map(serializeNote),
      upcomingReminders: upcomingReminders.map(serializeReminder),
    };
  }
}
