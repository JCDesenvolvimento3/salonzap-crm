import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
  ) {}

  @Get('profile')
  profile(@CurrentUser() user: RequestUser) {
    return this.settingsService.profile(user.id, user.salonId);
  }

  @Patch('profile')
  update(@CurrentUser() user: RequestUser, @Body() body: UpdateSettingsDto) {
    return this.settingsService.update(user.id, user.salonId, body);
  }
}
