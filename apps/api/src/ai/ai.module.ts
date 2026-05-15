import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenRouterService } from './openrouter.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService, OpenRouterService],
})
export class AiModule {}
