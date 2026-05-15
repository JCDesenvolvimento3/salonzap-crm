import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { RemindersService } from './reminders.service';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: 'PENDING' | 'DONE',
  ) {
    return this.remindersService.list(user.salonId, status);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateReminderDto) {
    return this.remindersService.create(user.salonId, user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') reminderId: string,
    @Body() body: UpdateReminderDto,
  ) {
    return this.remindersService.update(user.salonId, reminderId, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') reminderId: string) {
    return this.remindersService.remove(user.salonId, reminderId);
  }
}
