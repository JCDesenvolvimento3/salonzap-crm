import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'SalonZap API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
