import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type WindowDefinition = `${number} ${'s' | 'm' | 'h' | 'd'}`;

@Injectable()
export class UpstashRateLimitService {
  private readonly logger = new Logger(UpstashRateLimitService.name);
  private readonly enabled: boolean;
  private readonly redis: Redis | null;
  private readonly limiters = new Map<string, Ratelimit>();

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const url = this.configService
      .get<string>('UPSTASH_REDIS_REST_URL')
      ?.trim();
    const token = this.configService
      .get<string>('UPSTASH_REDIS_REST_TOKEN')
      ?.trim();

    this.enabled = Boolean(url && token);
    this.redis =
      this.enabled && url && token ? new Redis({ url, token }) : null;
  }

  isEnabled() {
    return this.enabled;
  }

  async assertAllowed({
    namespace,
    identifier,
    limit,
    window,
  }: {
    namespace: string;
    identifier: string;
    limit: number;
    window: WindowDefinition;
  }) {
    if (!this.enabled || !this.redis) {
      return;
    }

    const limiter = this.getLimiter(namespace, limit, window);
    const result = await limiter.limit(identifier);

    if (!result.success) {
      this.logger.warn(
        `Rate limit hit for ${namespace} (${identifier}), reset in ${result.reset}ms`,
      );
      throw new HttpException(
        'Muitas tentativas em um curto intervalo. Aguarde alguns instantes e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getLimiter(
    namespace: string,
    limit: number,
    window: WindowDefinition,
  ) {
    const key = `${namespace}:${limit}:${window}`;
    const cached = this.limiters.get(key);

    if (cached) {
      return cached;
    }

    const limiter = new Ratelimit({
      redis: this.redis!,
      analytics: true,
      prefix: `salonzap:${namespace}`,
      limiter: Ratelimit.slidingWindow(limit, window),
    });

    this.limiters.set(key, limiter);
    return limiter;
  }
}
