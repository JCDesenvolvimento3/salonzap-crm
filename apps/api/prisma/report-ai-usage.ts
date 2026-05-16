import { PrismaClient, type AiLogType } from '@prisma/client'

const prisma = new PrismaClient()

type UsageSummary = {
  requests: number
  fallbacks: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

function createSummary(): UsageSummary {
  return {
    requests: 0,
    fallbacks: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  }
}

function readUsage(response: unknown) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    }
  }

  const raw = (response as { raw?: { usage?: Record<string, unknown> } }).raw
  const usage = raw?.usage ?? {}

  const promptTokens = Number(usage.prompt_tokens ?? 0)
  const completionTokens = Number(usage.completion_tokens ?? 0)
  const totalTokens = Number(usage.total_tokens ?? promptTokens + completionTokens)

  return {
    promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : 0,
  }
}

async function main() {
  const days = Number(process.env.AI_USAGE_DAYS ?? '30')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const logs = await prisma.aiLog.findMany({
    where: {
      createdAt: {
        gte: since,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const byType = new Map<AiLogType, UsageSummary>()
  const byModel = new Map<string, UsageSummary>()

  for (const log of logs) {
    const usage = readUsage(log.response)
    const typeSummary = byType.get(log.type) ?? createSummary()
    const modelSummary = byModel.get(log.model) ?? createSummary()

    for (const summary of [typeSummary, modelSummary]) {
      summary.requests += 1
      summary.fallbacks += log.fallbackUsed ? 1 : 0
      summary.promptTokens += usage.promptTokens
      summary.completionTokens += usage.completionTokens
      summary.totalTokens += usage.totalTokens
    }

    byType.set(log.type, typeSummary)
    byModel.set(log.model, modelSummary)
  }

  console.log(`Uso de IA nos ultimos ${days} dias`)
  console.log(`Registros encontrados: ${logs.length}`)
  console.log('')
  console.log('Por tipo:')
  console.table(
    Array.from(byType.entries()).map(([type, summary]) => ({
      type,
      requests: summary.requests,
      fallbacks: summary.fallbacks,
      promptTokens: summary.promptTokens,
      completionTokens: summary.completionTokens,
      totalTokens: summary.totalTokens,
    })),
  )
  console.log('Por modelo:')
  console.table(
    Array.from(byModel.entries()).map(([model, summary]) => ({
      model,
      requests: summary.requests,
      fallbacks: summary.fallbacks,
      promptTokens: summary.promptTokens,
      completionTokens: summary.completionTokens,
      totalTokens: summary.totalTokens,
    })),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
