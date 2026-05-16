import { INestApplication, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function resolveDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return undefined;
  }

  try {
    const url = new URL(raw);
    const isSupabasePooler = url.hostname.includes('pooler.supabase.com');

    if (isSupabasePooler) {
      if (!url.port || url.port === '5432') {
        url.port = '6543';
      }

      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }

      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '1');
      }
    } else if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '5');
    }

    return url.toString();
  } catch {
    return raw;
  }
}

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const url = resolveDatabaseUrl();

    super(
      url
        ? {
            datasources: {
              db: {
                url,
              },
            },
          }
        : undefined,
    );
  }

  enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
