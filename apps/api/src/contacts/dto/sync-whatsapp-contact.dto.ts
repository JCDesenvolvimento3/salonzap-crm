import { IsOptional, IsString, MinLength } from 'class-validator';

export class SyncWhatsappContactDto {
  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  statusText?: string;
}
