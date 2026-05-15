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
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.campaignsService.list(user.salonId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateCampaignDto) {
    return this.campaignsService.create(user.salonId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') campaignId: string,
    @Body() body: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(user.salonId, campaignId, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') campaignId: string) {
    return this.campaignsService.remove(user.salonId, campaignId);
  }
}
