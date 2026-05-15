import { IsOptional, IsString, MinLength } from 'class-validator';

export class SummarizeConversationDto {
  @IsOptional()
  @IsString()
  contactId?: string;

  @IsString()
  @MinLength(6)
  conversation!: string;
}
