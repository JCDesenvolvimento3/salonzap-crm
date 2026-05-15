import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

let appPromise: Promise<INestApplication> | null = null;

async function createApp() {
  if (appPromise) {
    return appPromise;
  }

  appPromise = (async () => {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
      origin: true,
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    const prismaService = app.get(PrismaService);
    prismaService.enableShutdownHooks(app);

    await app.init();

    return app;
  })();

  return appPromise;
}

export async function getServer() {
  const app = await createApp();
  return app.getHttpAdapter().getInstance() as (
    req: Request,
    res: Response,
  ) => unknown;
}

export async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3333);
  return app;
}
