import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { noteInclude, serializeNote } from '../common/prisma/serializers';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
  ) {}

  async list(salonId: string, contactId?: string) {
    const notes = await this.prisma.note.findMany({
      where: {
        salonId,
        ...(contactId ? { contactId } : {}),
      },
      include: noteInclude,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    return notes.map(serializeNote);
  }

  async create(salonId: string, userId: string, payload: CreateNoteDto) {
    await this.ensureContact(salonId, payload.contactId);

    const note = await this.prisma.note.create({
      data: {
        salonId,
        authorId: userId,
        contactId: payload.contactId,
        body: payload.body,
        pinned: payload.pinned ?? false,
      },
      include: noteInclude,
    });

    await this.activityLogService.record({
      salonId,
      userId,
      entityType: 'contact',
      entityId: note.contactId,
      action: 'note_created',
      title: 'Nota adicionada ao contato',
      description: `Uma nova nota foi registrada para este contato.`,
      metadata: {
        noteId: note.id,
        pinned: note.pinned,
      },
    });

    return serializeNote(note);
  }

  async update(
    salonId: string,
    userId: string,
    noteId: string,
    payload: UpdateNoteDto,
  ) {
    await this.ensureNote(salonId, noteId);

    const note = await this.prisma.note.update({
      where: { id: noteId },
      data: payload,
      include: noteInclude,
    });

    await this.activityLogService.record({
      salonId,
      userId,
      entityType: 'contact',
      entityId: note.contactId,
      action: 'note_updated',
      title: 'Nota atualizada',
      description: 'Uma nota do contato foi revisada.',
      metadata: {
        noteId: note.id,
        pinned: note.pinned,
      },
    });

    return serializeNote(note);
  }

  async remove(salonId: string, userId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, salonId },
      select: {
        id: true,
        contactId: true,
      },
    });

    const result = await this.prisma.note.deleteMany({
      where: { id: noteId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Nota não encontrada.');
    }

    if (note) {
      await this.activityLogService.record({
        salonId,
        userId,
        entityType: 'contact',
        entityId: note.contactId,
        action: 'note_deleted',
        title: 'Nota removida',
        description: 'Uma nota do contato foi removida.',
        metadata: {
          noteId: note.id,
        },
      });
    }

    return { success: true as const };
  }

  private async ensureContact(salonId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, salonId },
    });

    if (!contact) {
      throw new NotFoundException('Contato não encontrado.');
    }
  }

  private async ensureNote(salonId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, salonId },
    });

    if (!note) {
      throw new NotFoundException('Nota não encontrada.');
    }
  }
}
