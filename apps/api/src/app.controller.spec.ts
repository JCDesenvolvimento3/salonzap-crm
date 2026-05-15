import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return service health metadata', () => {
      const response = appController.getHealth();

      expect(response.service).toBe('SalonZap API');
      expect(response.status).toBe('ok');
      expect(response.timestamp).toEqual(expect.any(String));
    });
  });
});
