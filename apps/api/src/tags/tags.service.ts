import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { serializeTag, tagSelect } from '../common/prisma/serializers';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(salonId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { salonId },
      select: tagSelect,
      orderBy: { name: 'asc' },
    });

    return tags.map(serializeTag);
  }

  async create(salonId: string, payload: CreateTagDto) {
    const existing = await this.prisma.tag.findFirst({
      where: {
        salonId,
        name: {
          equals: payload.name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictException('Já existe uma tag com esse nome.');
    }

    const tag = await this.prisma.tag.create({
      data: {
        salonId,
        name: payload.name,
        color: payload.color,
      },
      select: tagSelect,
    });

    return serializeTag(tag);
  }

  async update(salonId: string, tagId: string, payload: UpdateTagDto) {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, salonId },
    });

    if (!tag) {
      throw new NotFoundException('Tag não encontrada.');
    }

    if (payload.name) {
      const existing = await this.prisma.tag.findFirst({
        where: {
          salonId,
          id: { not: tagId },
          name: {
            equals: payload.name,
            mode: 'insensitive',
          },
        },
      });

      if (existing) {
        throw new ConflictException('Já existe uma tag com esse nome.');
      }
    }

    const updated = await this.prisma.tag.update({
      where: { id: tagId },
      data: payload,
      select: tagSelect,
    });

    return serializeTag(updated);
  }

  async remove(salonId: string, tagId: string) {
    const result = await this.prisma.tag.deleteMany({
      where: { id: tagId, salonId },
    });

    if (!result.count) {
      throw new NotFoundException('Tag não encontrada.');
    }

    return { success: true as const };
  }
}
