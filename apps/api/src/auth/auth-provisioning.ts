import { Prisma, type PrismaClient } from '@prisma/client';

export const defaultStages = [
  {
    name: 'Novo lead',
    slug: 'novo-lead',
    color: '#FB7185',
    order: 1,
    winProbability: 10,
  },
  {
    name: 'Interessado',
    slug: 'interessado',
    color: '#8B5CF6',
    order: 2,
    winProbability: 35,
  },
  {
    name: 'Agendou',
    slug: 'agendou',
    color: '#06B6D4',
    order: 3,
    winProbability: 60,
  },
  {
    name: 'Compareceu',
    slug: 'compareceu',
    color: '#10B981',
    order: 4,
    winProbability: 80,
  },
  {
    name: 'Cliente fiel',
    slug: 'cliente-fiel',
    color: '#F59E0B',
    order: 5,
    winProbability: 100,
  },
  {
    name: 'Perdido',
    slug: 'perdido',
    color: '#64748B',
    order: 6,
    winProbability: 0,
  },
] as const;

export const defaultTags = [
  { name: 'VIP', color: '#F59E0B' },
  { name: 'Reagendar', color: '#3B82F6' },
  { name: 'Coloracao', color: '#EC4899' },
  { name: 'Recorrente', color: '#10B981' },
] as const;

export const defaultQuickReplies = [
  {
    title: 'Boas-vindas',
    shortcut: '/oi',
    body: 'Oi! Aqui e da equipe do salao. Me conta rapidinho qual servico voce quer fazer para eu te indicar a melhor opcao.',
    category: 'Atendimento',
  },
  {
    title: 'Confirmacao',
    shortcut: '/confirma',
    body: 'Seu horario esta confirmado. Se precisar remarcar, me chama por aqui com antecedencia.',
    category: 'Agenda',
  },
  {
    title: 'Reativacao',
    shortcut: '/reativar',
    body: 'Passando para te avisar que abrimos alguns horarios especiais nesta semana. Quer que eu veja um encaixe para voce?',
    category: 'Campanhas',
  },
] as const;

export const defaultWelcomeMessage =
  'CRM e WhatsApp no mesmo fluxo para recuperar clientes, organizar follow-up e acelerar conversao.';

type ProvisioningPrismaClient = PrismaClient | Prisma.TransactionClient;

export async function syncBaselineSetup(
  prisma: ProvisioningPrismaClient,
  salonId: string,
  authorId: string,
) {
  for (const stage of defaultStages) {
    await prisma.stage.upsert({
      where: {
        salonId_slug: {
          salonId,
          slug: stage.slug,
        },
      },
      update: {
        name: stage.name,
        color: stage.color,
        order: stage.order,
        winProbability: stage.winProbability,
      },
      create: {
        salonId,
        ...stage,
      },
    });
  }

  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: {
        salonId_name: {
          salonId,
          name: tag.name,
        },
      },
      update: {
        color: tag.color,
      },
      create: {
        salonId,
        ...tag,
      },
    });
  }

  for (const quickReply of defaultQuickReplies) {
    await prisma.quickReply.upsert({
      where: {
        salonId_shortcut: {
          salonId,
          shortcut: quickReply.shortcut,
        },
      },
      update: {
        title: quickReply.title,
        body: quickReply.body,
        category: quickReply.category,
      },
      create: {
        salonId,
        authorId,
        ...quickReply,
      },
    });
  }
}

export function toWorkspaceSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
