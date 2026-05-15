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
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('contactId') contactId?: string,
  ) {
    return this.notesService.list(user.salonId, contactId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateNoteDto) {
    return this.notesService.create(user.salonId, user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') noteId: string,
    @Body() body: UpdateNoteDto,
  ) {
    return this.notesService.update(user.salonId, noteId, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') noteId: string) {
    return this.notesService.remove(user.salonId, noteId);
  }
}
