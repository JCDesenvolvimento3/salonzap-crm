import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { finalize } from 'rxjs';
import type { RequestUser } from '../interfaces/request-user.interface';

type RequestWithUser = Request & {
  user?: RequestUser;
  method: string;
  originalUrl?: string;
  url: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
};

@Injectable()
export class RequestMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const startedAt = Date.now();
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<ResponseLike>();

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        response.setHeader('x-response-time', `${durationMs}ms`);

        const payload = {
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode: response.statusCode,
          durationMs,
          salonId: request.user?.salonId ?? null,
          userId: request.user?.id ?? null,
          ip:
            request.headers['x-real-ip'] ||
            request.headers['x-forwarded-for'] ||
            request.ip ||
            null,
        };

        this.logger.log(JSON.stringify(payload));
      }),
    );
  }
}
