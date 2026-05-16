import { IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @MinLength(8)
  code!: string;

  @IsString()
  @MinLength(8)
  redirectUri!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  salonName?: string;
}
