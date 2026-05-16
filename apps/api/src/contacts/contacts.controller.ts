import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListRecoveryCandidatesDto } from './dto/list-recovery-candidates.dto';
import { SyncWhatsappContactDto } from './dto/sync-whatsapp-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactsService } from './contacts.service';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(
    @Inject(ContactsService)
    private readonly contactsService: ContactsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('query') query?: string,
    @Query('stageId') stageId?: string,
  ) {
    return this.contactsService.list(user.salonId, query, stageId);
  }

  @Get('recovery-candidates')
  recoveryCandidates(
    @CurrentUser() user: RequestUser,
    @Query() query: ListRecoveryCandidatesDto,
  ) {
    return this.contactsService.listRecoveryCandidates(user.salonId, query);
  }

  @Get(':id')
  detail(@CurrentUser() user: RequestUser, @Param('id') contactId: string) {
    return this.contactsService.detail(user.salonId, contactId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateContactDto) {
    return this.contactsService.create(user.salonId, user.id, body);
  }

  @Post('sync-from-whatsapp')
  syncFromWhatsapp(
    @CurrentUser() user: RequestUser,
    @Body() body: SyncWhatsappContactDto,
  ) {
    return this.contactsService.syncFromWhatsapp(user.salonId, user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') contactId: string,
    @Body() body: UpdateContactDto,
  ) {
    return this.contactsService.update(user.salonId, user.id, contactId, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') contactId: string) {
    return this.contactsService.remove(user.salonId, user.id, contactId);
  }
}
