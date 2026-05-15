import { IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  userName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  salonName?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsHexColor()
  brandColor?: string;
}
