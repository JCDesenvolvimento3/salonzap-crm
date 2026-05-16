import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(5)
  message!: string;

  @IsString()
  @MinLength(2)
  audience!: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'SCHEDULED', 'SENT', 'PAUSED'])
  status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'PAUSED';
}
