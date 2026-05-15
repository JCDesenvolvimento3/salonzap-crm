import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueAt!: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'DONE'])
  status?: 'PENDING' | 'DONE';
}
