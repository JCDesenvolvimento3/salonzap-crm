import bcrypt from 'bcrypt'
import { AiLogType, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.salon.deleteMany({
    where: { slug: 'salonzap-demo' },
  })

  const passwordHash = await bcrypt.hash('123456', 10)

  const salon = await prisma.salon.create({
    data: {
      name: 'Studio Bella Forma',
      slug: 'salonzap-demo',
      timezone: 'America/Sao_Paulo',
      welcomeMessage:
        'Atendimento, follow-up e recuperacao de clientes no mesmo fluxo do WhatsApp.',
      brandColor: '#FB7185',
    },
  })

  const user = await prisma.user.create({
    data: {
      salonId: salon.id,
      name: 'Amanda Costa',
      email: 'admin@salonzap.local',
      passwordHash,
      role: 'owner',
    },
  })

  const stages = await Promise.all(
    [
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
    ].map((stage) =>
      prisma.stage.create({
        data: {
          salonId: salon.id,
          ...stage,
        },
      }),
    ),
  )

  const tags = await Promise.all(
    [
      { name: 'VIP', color: '#F59E0B' },
      { name: 'Reagendar', color: '#3B82F6' },
      { name: 'Coloracao', color: '#EC4899' },
      { name: 'Corte + Escova', color: '#10B981' },
    ].map((tag) =>
      prisma.tag.create({
        data: {
          salonId: salon.id,
          ...tag,
        },
      }),
    ),
  )

  const contacts = await Promise.all(
    [
      {
        name: 'Marina Freitas',
        phone: '+55 11 99888-2211',
        email: 'marina@email.com',
        city: 'Sao Paulo',
        source: 'Instagram',
        statusText: 'Pediu orcamento para corte e luzes.',
        whatsappName: 'Marina',
        stageId: stages[1].id,
        tagIndexes: [0, 2],
      },
      {
        name: 'Bianca Souza',
        phone: '+55 11 97777-4411',
        email: 'bianca@email.com',
        city: 'Campinas',
        source: 'Indicacao',
        statusText: 'Quer encaixe para sexta a tarde.',
        whatsappName: 'Bianca S.',
        stageId: stages[2].id,
        tagIndexes: [0],
      },
      {
        name: 'Carlos Menezes',
        phone: '+55 21 96666-9944',
        email: 'carlos@email.com',
        city: 'Rio de Janeiro',
        source: 'WhatsApp direto',
        statusText: 'Cliente recorrente de corte e barba.',
        whatsappName: 'Carlos',
        stageId: stages[4].id,
        tagIndexes: [3],
      },
      {
        name: 'Fernanda Lima',
        phone: '+55 31 95555-0022',
        email: 'fernanda@email.com',
        city: 'Belo Horizonte',
        source: 'Google Maps',
        statusText: 'Primeiro atendimento para botox capilar.',
        whatsappName: 'Fer Lima',
        stageId: stages[0].id,
        tagIndexes: [1],
      },
      {
        name: 'Julia Ramos',
        phone: '+55 11 93333-8811',
        email: 'julia@email.com',
        city: 'Sao Paulo',
        source: 'Retorno apos campanha',
        statusText: 'Gostou da proposta e pediu confirmacao.',
        whatsappName: 'Julia',
        stageId: stages[3].id,
        tagIndexes: [2],
      },
    ].map(async (contact) => {
      const created = await prisma.contact.create({
        data: {
          salonId: salon.id,
          stageId: contact.stageId,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          city: contact.city,
          source: contact.source,
          statusText: contact.statusText,
          whatsappName: contact.whatsappName,
          lastInteractionAt: new Date(),
        },
      })

      await prisma.contactTag.createMany({
        data: contact.tagIndexes.map((tagIndex) => ({
          contactId: created.id,
          tagId: tags[tagIndex].id,
        })),
      })

      return created
    }),
  )

  await prisma.note.createMany({
    data: [
      {
        salonId: salon.id,
        contactId: contacts[0].id,
        authorId: user.id,
        body: 'Cliente pediu pacote com manutencao mensal. Sensivel a preco, mas respondeu rapido.',
        pinned: true,
      },
      {
        salonId: salon.id,
        contactId: contacts[1].id,
        authorId: user.id,
        body: 'Enviar confirmacao e localizacao 2h antes do horario.',
      },
      {
        salonId: salon.id,
        contactId: contacts[2].id,
        authorId: user.id,
        body: 'Oferecer pacote recorrente de corte e barba no proximo contato.',
      },
    ],
  })

  await prisma.quickReply.createMany({
    data: [
      {
        salonId: salon.id,
        authorId: user.id,
        title: 'Boas-vindas',
        shortcut: '/oi',
        body: 'Oi! Aqui e da equipe do Studio Bella Forma. Me conta qual servico voce quer fazer para eu te passar a melhor opcao.',
        category: 'Atendimento',
      },
      {
        salonId: salon.id,
        authorId: user.id,
        title: 'Confirmacao',
        shortcut: '/confirma',
        body: 'Seu horario esta confirmado. Se precisar remarcar, me chama por aqui com antecedencia.',
        category: 'Agenda',
      },
      {
        salonId: salon.id,
        authorId: user.id,
        title: 'Reativacao',
        shortcut: '/reativar',
        body: 'Passando para te avisar que abrimos alguns horarios nesta semana. Quer que eu veja um encaixe para voce?',
        category: 'Campanhas',
      },
    ],
  })

  await prisma.reminder.createMany({
    data: [
      {
        salonId: salon.id,
        ownerId: user.id,
        contactId: contacts[0].id,
        title: 'Enviar orcamento final',
        description: 'Mandar opcoes de corte e luzes antes do almoco.',
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 3),
      },
      {
        salonId: salon.id,
        ownerId: user.id,
        contactId: contacts[1].id,
        title: 'Confirmar presenca',
        description: 'Lembrar a cliente sobre o estacionamento parceiro.',
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 18),
      },
      {
        salonId: salon.id,
        ownerId: user.id,
        contactId: contacts[3].id,
        title: 'Reengajar lead frio',
        description: 'Oferecer bonus de hidratacao na primeira visita.',
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 30),
      },
    ],
  })

  await prisma.campaign.createMany({
    data: [
      {
        salonId: salon.id,
        title: 'Reativacao de clientes inativos',
        message: 'Temos horarios disponiveis nesta semana com bonus de escova finalizadora.',
        audience: 'Clientes sem compra ha 45 dias',
        status: 'SCHEDULED',
        scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 8),
      },
      {
        salonId: salon.id,
        title: 'Lembrete de agenda da semana',
        message: 'Ainda temos alguns horarios para corte, coloracao e escova nesta semana.',
        audience: 'Clientes que pediram disponibilidade',
        status: 'DRAFT',
      },
      {
        salonId: salon.id,
        title: 'Confirmacao automatizada da sexta',
        message: 'Sua agenda de sexta esta confirmada. Responda aqui se precisar remarcar.',
        audience: 'Agendamentos de sexta',
        status: 'SENT',
        scheduledFor: new Date(Date.now() - 1000 * 60 * 60 * 16),
      },
    ],
  })

  await prisma.aiLog.createMany({
    data: [
      {
        salonId: salon.id,
        userId: user.id,
        contactId: contacts[0].id,
        type: AiLogType.SUGGEST_REPLY,
        provider: 'openrouter',
        model: 'deepseek/deepseek-v4-flash:free',
        request: {
          contactId: contacts[0].id,
          conversation: 'Cliente perguntou sobre corte e luzes.',
        },
        response: {
          reply: 'Consigo te orientar nas melhores opcoes para corte e luzes.',
        },
        success: true,
      },
      {
        salonId: salon.id,
        userId: user.id,
        contactId: contacts[3].id,
        type: AiLogType.IDENTIFY_INTENT,
        provider: 'openrouter',
        model: 'deepseek/deepseek-v4-flash:free',
        request: {
          contactId: contacts[3].id,
          conversation: 'Cliente quer saber horarios para botox capilar.',
        },
        response: {
          intent: 'booking',
        },
        success: false,
        fallbackUsed: true,
        errorMessage: 'Fallback demo',
      },
    ],
  })

  await prisma.activityLog.createMany({
    data: [
      {
        salonId: salon.id,
        userId: user.id,
        entityType: 'contact',
        entityId: contacts[0].id,
        action: 'created',
        title: 'Contato cadastrado',
        description: 'Marina Freitas entrou no CRM pela origem Instagram.',
      },
      {
        salonId: salon.id,
        userId: user.id,
        entityType: 'contact',
        entityId: contacts[1].id,
        action: 'moved_stage',
        title: 'Contato movido no funil',
        description: 'Bianca Souza foi movida para Agendou.',
      },
      {
        salonId: salon.id,
        userId: user.id,
        entityType: 'campaign',
        entityId: null,
        action: 'created',
        title: 'Campanha criada',
        description: 'Reativacao de clientes inativos foi criada com status agendada.',
      },
      {
        salonId: salon.id,
        userId: user.id,
        entityType: 'reminder',
        entityId: null,
        action: 'created',
        title: 'Lembrete criado',
        description: 'Enviar orcamento final foi agendado para Marina Freitas.',
      },
      {
        salonId: salon.id,
        userId: user.id,
        entityType: 'contact',
        entityId: contacts[0].id,
        action: 'ai_success',
        title: 'IA gerou sugestao de resposta',
        description: 'Uma sugestao de resposta foi gerada com resposta real.',
      },
      {
        salonId: salon.id,
        userId: user.id,
        entityType: 'contact',
        entityId: contacts[3].id,
        action: 'ai_fallback',
        title: 'IA identificou a intencao com fallback',
        description: 'A intencao do cliente foi classificada usando o fallback seguro.',
      },
    ],
  })

  console.log('Seed demo concluido com sucesso.')
  console.log('Login:', user.email)
  console.log('Senha: 123456')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
