import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import { getBootstrapConfig, syncBaselineSetup } from './seed-support'

const prisma = new PrismaClient()

async function main() {
  const config = getBootstrapConfig()
  const passwordHash = await bcrypt.hash(config.adminPassword, 10)

  const salon = await prisma.salon.upsert({
    where: { slug: config.salonSlug },
    update: {
      name: config.salonName,
      timezone: config.timezone,
      welcomeMessage: config.welcomeMessage,
      brandColor: config.brandColor,
    },
    create: {
      name: config.salonName,
      slug: config.salonSlug,
      timezone: config.timezone,
      welcomeMessage: config.welcomeMessage,
      brandColor: config.brandColor,
    },
  })

  const user = await prisma.user.upsert({
    where: { email: config.adminEmail },
    update: {
      salonId: salon.id,
      name: config.adminName,
      passwordHash,
      role: 'owner',
    },
    create: {
      salonId: salon.id,
      name: config.adminName,
      email: config.adminEmail,
      passwordHash,
      role: 'owner',
    },
  })

  await syncBaselineSetup(prisma, salon.id, user.id)

  console.log('Bootstrap de producao concluido com sucesso.')
  console.log(`Salao: ${salon.name} (${salon.slug})`)
  console.log(`Admin: ${user.email}`)
  console.log('Etapas, tags e respostas rapidas basicas sincronizadas.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
