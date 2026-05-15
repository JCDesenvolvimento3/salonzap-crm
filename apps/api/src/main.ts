import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { bootstrap, getServer } from './bootstrap';

void NestFactory;

const serverPromise = getServer();

export default async function handler(req: Request, res: Response) {
  const server = await serverPromise;
  return server(req, res);
}

if (!process.env.VERCEL) {
  void bootstrap();
}
