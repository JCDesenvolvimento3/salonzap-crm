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
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.tagsService.list(user.salonId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateTagDto) {
    return this.tagsService.create(user.salonId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') tagId: string,
    @Body() body: UpdateTagDto,
  ) {
    return this.tagsService.update(user.salonId, tagId, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') tagId: string) {
    return this.tagsService.remove(user.salonId, tagId);
  }
}
