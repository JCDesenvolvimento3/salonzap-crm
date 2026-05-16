import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class GenerateReactivationMessageDto {
  @IsString()
  @MinLength(3)
  contactId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  daysInactive?: number;

  @IsOptional()
  @IsString()
  objective?: string;
}
