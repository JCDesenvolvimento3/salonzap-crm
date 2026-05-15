import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { QuickRepliesService } from './quick-replies.service';

@Controller('quick-replies')
@UseGuards(JwtAuthGuard)
export class QuickRepliesController {
  constructor(private readonly quickRepliesService: QuickRepliesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.quickRepliesService.list(user.salonId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateQuickReplyDto) {
    return this.quickRepliesService.create(user.salonId, user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') quickReplyId: string,
    @Body() body: UpdateQuickReplyDto,
  ) {
    return this.quickRepliesService.update(user.salonId, quickReplyId, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') quickReplyId: string) {
    return this.quickRepliesService.remove(user.salonId, quickReplyId);
  }
}
