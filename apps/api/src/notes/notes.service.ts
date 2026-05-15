import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { noteInclude, serializeNote } from '../common/prisma/serializers';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return serializeNote(note);
  }

  async update(salonId: string, noteId: string, payload: UpdateNoteDto) {
    await this.ensureNote(salonId, noteId);

    const note = await this.prisma.note.update({
      where: { id: noteId },
      data: payload,
      include: noteInclude,
    });

    return serializeNote(note);
  }

  async remove(salonId: string, noteId: string) {
    const result = await this.prisma.note.deleteMany({
      where: { id: noteId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Nota não encontrada.');
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
