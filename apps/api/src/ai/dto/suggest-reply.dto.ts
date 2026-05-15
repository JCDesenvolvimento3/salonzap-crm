import { IsOptional, IsString, MinLength } from 'class-validator';

export class SuggestReplyDto {
  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsString()
  @MinLength(6)
  conversation!: string;

  @IsOptional()
  @IsString()
  goal?: string;
}
