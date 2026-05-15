import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  message?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  audience?: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string | null;

  @IsOptional()
  @IsIn(['DRAFT', 'SCHEDULED', 'SENT'])
  status?: 'DRAFT' | 'SCHEDULED' | 'SENT';
}
