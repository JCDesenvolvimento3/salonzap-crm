import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  reminderInclude,
  serializeReminder,
} from '../common/prisma/serializers';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(salonId: string, status?: 'PENDING' | 'DONE') {
    const reminders = await this.prisma.reminder.findMany({
      where: {
        salonId,
        ...(status ? { status } : {}),
      },
      include: reminderInclude,
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    });

    return reminders.map(serializeReminder);
  }

  async create(salonId: string, ownerId: string, payload: CreateReminderDto) {
    await this.ensureContact(salonId, payload.contactId);

    const reminder = await this.prisma.reminder.create({
      data: {
        salonId,
        ownerId,
        contactId: payload.contactId ?? null,
        title: payload.title,
        description: payload.description?.trim() || null,
        dueAt: new Date(payload.dueAt),
        status: payload.status ?? 'PENDING',
      },
      include: reminderInclude,
    });

    return serializeReminder(reminder);
  }

  async update(
    salonId: string,
    reminderId: string,
    payload: UpdateReminderDto,
  ) {
    await this.ensureReminder(salonId, reminderId);
    await this.ensureContact(salonId, payload.contactId);

    const reminder = await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description || null }
          : {}),
        ...(payload.dueAt !== undefined
          ? { dueAt: new Date(payload.dueAt) }
          : {}),
        ...(payload.contactId !== undefined
          ? { contactId: payload.contactId || null }
          : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
      },
      include: reminderInclude,
    });

    return serializeReminder(reminder);
  }

  async remove(salonId: string, reminderId: string) {
    const result = await this.prisma.reminder.deleteMany({
      where: { id: reminderId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Lembrete não encontrado.');
    }

    return { success: true as const };
  }

  private async ensureReminder(salonId: string, reminderId: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id: reminderId, salonId },
    });

    if (!reminder) {
      throw new NotFoundException('Lembrete não encontrado.');
    }
  }

  private async ensureContact(salonId: string, contactId?: string | null) {
    if (!contactId) {
      return;
    }

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, salonId },
    });

    if (!contact) {
      throw new NotFoundException('Contato não encontrado.');
    }
  }
}
