import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateQuickReplyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  shortcut?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  body?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
