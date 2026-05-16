import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { UpstashRateLimitService } from '../common/services/upstash-rate-limit.service';
import { AiService } from './ai.service';
import { GenerateCampaignDto } from './dto/generate-campaign.dto';
import { GenerateReactivationMessageDto } from './dto/generate-reactivation-message.dto';
import { IdentifyIntentDto } from './dto/identify-intent.dto';
import { SuggestReplyDto } from './dto/suggest-reply.dto';
import { SummarizeConversationDto } from './dto/summarize-conversation.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(UpstashRateLimitService)
    private readonly rateLimitService: UpstashRateLimitService,
  ) {}

  private async guardUser(user: RequestUser) {
    await this.rateLimitService.assertAllowed({
      namespace: 'ai',
      identifier: user.id,
      limit: 24,
      window: '1 m',
    });
  }

  @Post('suggest-reply')
  async suggestReply(
    @CurrentUser() user: RequestUser,
    @Body() body: SuggestReplyDto,
  ) {
    await this.guardUser(user);
    return this.aiService.suggestReply(user, body);
  }

  @Post('summarize-conversation')
  async summarizeConversation(
    @CurrentUser() user: RequestUser,
    @Body() body: SummarizeConversationDto,
  ) {
    await this.guardUser(user);
    return this.aiService.summarizeConversation(user, body);
  }

  @Post('generate-campaign')
  async generateCampaign(
    @CurrentUser() user: RequestUser,
    @Body() body: GenerateCampaignDto,
  ) {
    await this.guardUser(user);
    return this.aiService.generateCampaign(user, body);
  }

  @Post('identify-intent')
  async identifyIntent(
    @CurrentUser() user: RequestUser,
    @Body() body: IdentifyIntentDto,
  ) {
    await this.guardUser(user);
    return this.aiService.identifyIntent(user, body);
  }

  @Post('generate-reactivation-message')
  async generateReactivationMessage(
    @CurrentUser() user: RequestUser,
    @Body() body: GenerateReactivationMessageDto,
  ) {
    await this.guardUser(user);
    return this.aiService.generateReactivationMessage(user, body);
  }
}
