import { IsOptional, IsString, MinLength } from 'class-validator';

export class GenerateCampaignDto {
  @IsString()
  @MinLength(10)
  prompt!: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  audienceHint?: string;
}
