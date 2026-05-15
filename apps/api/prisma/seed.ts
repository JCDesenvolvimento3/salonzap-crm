import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.salon.deleteMany({
    where: { slug: 'salonzap-demo' },
  })

  const passwordHash = await bcrypt.hash('123456', 10)

  const salon = await prisma.salon.create({
    data: {
      name: 'SalonZap Studio',
      slug: 'salonzap-demo',
      timezone: 'America/Sao_Paulo',
      welcomeMessage: 'Fluxo premium para relacionamento e conversão no WhatsApp.',
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
      { name: 'Novo lead', slug: 'novo-lead', color: '#FB7185', order: 1, winProbability: 10 },
      { name: 'Em conversa', slug: 'em-conversa', color: '#8B5CF6', order: 2, winProbability: 35 },
      { name: 'Agendamento', slug: 'agendamento', color: '#06B6D4', order: 3, winProbability: 60 },
      { name: 'Confirmado', slug: 'confirmado', color: '#10B981', order: 4, winProbability: 80 },
      { name: 'Cliente', slug: 'cliente', color: '#F59E0B', order: 5, winProbability: 100 },
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
      { name: 'Coloração', color: '#EC4899' },
      { name: 'Corte + Barba', color: '#10B981' },
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
        city: 'São Paulo',
        source: 'Campanha Instagram',
        statusText: 'Pediu orçamento para corte + luzes',
        whatsappName: 'Marina ✨',
        stageId: stages[1].id,
        tagIndexes: [0, 2],
      },
      {
        name: 'Bianca Souza',
        phone: '+55 11 97777-4411',
        email: 'bianca@email.com',
        city: 'Campinas',
        source: 'Indicação',
        statusText: 'Quer encaixe nesta semana',
        whatsappName: 'Bianca S.',
        stageId: stages[3].id,
        tagIndexes: [0],
      },
      {
        name: 'Carlos Menezes',
        phone: '+55 21 96666-9944',
        email: 'carlos@email.com',
        city: 'Rio de Janeiro',
        source: 'WhatsApp direto',
        statusText: 'Cliente recorrente de barba premium',
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
        statusText: 'Primeiro atendimento para botox capilar',
        whatsappName: 'Fer Lima',
        stageId: stages[0].id,
        tagIndexes: [1],
      },
      {
        name: 'Julia Ramos',
        phone: '+55 11 93333-8811',
        email: 'julia@email.com',
        city: 'São Paulo',
        source: 'Retorno pós-campanha',
        statusText: 'Gostou da proposta e pediu confirmação',
        whatsappName: 'Julia',
        stageId: stages[2].id,
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
        body: 'Cliente pediu pacote com manutenção mensal. Sensível a preço, mas respondeu rápido.',
        pinned: true,
      },
      {
        salonId: salon.id,
        contactId: contacts[1].id,
        authorId: user.id,
        body: 'Enviar confirmação e localização 2h antes do horário.',
      },
      {
        salonId: salon.id,
        contactId: contacts[2].id,
        authorId: user.id,
        body: 'Oferecer plano recorrente de barba premium no próximo contato.',
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
        body: 'Oi! Aqui é da equipe SalonZap Studio. Me conta rapidinho qual serviço você quer fazer para eu te passar a melhor opção.',
        category: 'Atendimento',
      },
      {
        salonId: salon.id,
        authorId: user.id,
        title: 'Confirmação',
        shortcut: '/confirma',
        body: 'Seu horário está confirmado. Se precisar remarcar, me chama por aqui com antecedência.',
        category: 'Agenda',
      },
      {
        salonId: salon.id,
        authorId: user.id,
        title: 'Reativação',
        shortcut: '/reativar',
        body: 'Passando para te avisar que abrimos alguns horários premium nesta semana. Quer que eu veja um encaixe para você?',
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
        title: 'Enviar orçamento final',
        description: 'Mandar opções de corte + luzes antes do almoço.',
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 3),
      },
      {
        salonId: salon.id,
        ownerId: user.id,
        contactId: contacts[1].id,
        title: 'Confirmar presença',
        description: 'Lembrar a cliente sobre o estacionamento parceiro.',
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 18),
      },
      {
        salonId: salon.id,
        ownerId: user.id,
        contactId: contacts[3].id,
        title: 'Reengajar lead frio',
        description: 'Oferecer bônus de hidratação na primeira visita.',
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 30),
      },
    ],
  })

  await prisma.campaign.createMany({
    data: [
      {
        salonId: salon.id,
        title: 'Reativação de clientes inativos',
        message: 'Temos horários premium disponíveis nesta semana com bônus de escova finalizadora.',
        audience: 'Clientes sem compra há 45 dias',
        status: 'SCHEDULED',
        scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 8),
      },
      {
        salonId: salon.id,
        title: 'Promo corte + barba',
        message: 'Combo especial de corte + barba com atendimento expresso.',
        audience: 'Base masculina VIP',
        status: 'DRAFT',
      },
      {
        salonId: salon.id,
        title: 'Confirmação automatizada da sexta',
        message: 'Sua agenda de sexta está confirmada. Responda aqui se precisar remarcar.',
        audience: 'Agendamentos de sexta',
        status: 'SENT',
        scheduledFor: new Date(Date.now() - 1000 * 60 * 60 * 16),
      },
    ],
  })

  console.log('Seed concluído com sucesso.')
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
