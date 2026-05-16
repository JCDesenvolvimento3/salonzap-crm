import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deletedSalons = await prisma.salon.deleteMany({
    where: {
      OR: [
        { slug: 'salonzap-demo' },
        { name: 'SalonZap Studio' },
      ],
    },
  })

  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: 'admin@salonzap.local',
    },
  })

  console.log('Base demo removida.')
  console.log(`Saloes removidos: ${deletedSalons.count}`)
  console.log(`Usuarios removidos: ${deletedUsers.count}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
