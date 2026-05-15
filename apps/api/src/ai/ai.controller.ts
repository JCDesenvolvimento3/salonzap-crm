import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { AiService } from './ai.service';
import { GenerateCampaignDto } from './dto/generate-campaign.dto';
import { IdentifyIntentDto } from './dto/identify-intent.dto';
import { SuggestReplyDto } from './dto/suggest-reply.dto';
import { SummarizeConversationDto } from './dto/summarize-conversation.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(@Inject(AiService) private readonly aiService: AiService) {}

  @Post('suggest-reply')
  suggestReply(
    @CurrentUser() user: RequestUser,
    @Body() body: SuggestReplyDto,
  ) {
    return this.aiService.suggestReply(user, body);
  }

  @Post('summarize-conversation')
  summarizeConversation(
    @CurrentUser() user: RequestUser,
    @Body() body: SummarizeConversationDto,
  ) {
    return this.aiService.summarizeConversation(user, body);
  }

  @Post('generate-campaign')
  generateCampaign(
    @CurrentUser() user: RequestUser,
    @Body() body: GenerateCampaignDto,
  ) {
    return this.aiService.generateCampaign(user, body);
  }

  @Post('identify-intent')
  identifyIntent(
    @CurrentUser() user: RequestUser,
    @Body() body: IdentifyIntentDto,
  ) {
    return this.aiService.identifyIntent(user, body);
  }
}
