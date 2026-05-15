import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  contactId!: string;

  @IsString()
  @MinLength(2)
  body!: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
