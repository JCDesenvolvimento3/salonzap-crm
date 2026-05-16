import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityLogService } from './services/activity-log.service';
import { TransactionalMailService } from './services/transactional-mail.service';
import { UpstashRateLimitService } from './services/upstash-rate-limit.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    ActivityLogService,
    UpstashRateLimitService,
    TransactionalMailService,
  ],
  exports: [
    ActivityLogService,
    UpstashRateLimitService,
    TransactionalMailService,
  ],
})
export class CommonModule {}
