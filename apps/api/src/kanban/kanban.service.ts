import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  contactSummaryInclude,
  serializeContactSummary,
  serializeStage,
} from '../common/prisma/serializers';

@Injectable()
export class KanbanService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async board(salonId: string) {
    const stages = await this.prisma.stage.findMany({
      where: { salonId },
      orderBy: { order: 'asc' },
      include: {
        contacts: {
          include: contactSummaryInclude,
          orderBy: [{ lastInteractionAt: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    return {
      stages: stages.map((stage) => ({
        ...serializeStage(stage),
        contacts: stage.contacts.map(serializeContactSummary),
      })),
    };
  }

  async move(salonId: string, contactId: string, targetStageId: string) {
    const [contact, stage] = await Promise.all([
      this.prisma.contact.findFirst({
        where: { id: contactId, salonId },
      }),
      this.prisma.stage.findFirst({
        where: { id: targetStageId, salonId },
      }),
    ]);

    if (!contact) {
      throw new NotFoundException('Contato não encontrado.');
    }

    if (!stage) {
      throw new BadRequestException('Coluna de destino inválida.');
    }

    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        stageId: targetStageId,
        lastInteractionAt: new Date(),
      },
      include: contactSummaryInclude,
    });

    return serializeContactSummary(updated);
  }
}
