import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateQuickReplyDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  shortcut!: string;

  @IsString()
  @MinLength(3)
  body!: string;

  @IsOptional()
  @IsString()
  category?: string;
}
