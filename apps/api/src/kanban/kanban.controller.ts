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
import { MoveContactDto } from './dto/move-contact.dto';
import { KanbanService } from './kanban.service';

@Controller('kanban')
@UseGuards(JwtAuthGuard)
export class KanbanController {
  constructor(
    @Inject(KanbanService)
    private readonly kanbanService: KanbanService,
  ) {}

  @Get('board')
  board(@CurrentUser() user: RequestUser) {
    return this.kanbanService.board(user.salonId);
  }

  @Patch('move')
  move(@CurrentUser() user: RequestUser, @Body() body: MoveContactDto) {
    return this.kanbanService.move(
      user.salonId,
      user.id,
      body.contactId,
      body.targetStageId,
    );
  }
}
