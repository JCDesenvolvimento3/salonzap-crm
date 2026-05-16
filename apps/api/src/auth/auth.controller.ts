import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UpstashRateLimitService } from '../common/services/upstash-rate-limit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(UpstashRateLimitService)
    private readonly rateLimitService: UpstashRateLimitService,
  ) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('x-real-ip') realIp?: string,
  ) {
    const identifier =
      realIp?.split(',')[0]?.trim() ||
      forwardedFor?.split(',')[0]?.trim() ||
      body.email.toLowerCase();

    await this.rateLimitService.assertAllowed({
      namespace: 'auth-login',
      identifier,
      limit: 8,
      window: '10 m',
    });

    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('x-real-ip') realIp?: string,
  ) {
    const identifier =
      realIp?.split(',')[0]?.trim() ||
      forwardedFor?.split(',')[0]?.trim() ||
      body.email.toLowerCase();

    await this.rateLimitService.assertAllowed({
      namespace: 'auth-register',
      identifier,
      limit: 4,
      window: '20 m',
    });

    return this.authService.register(body);
  }

  @Post('google')
  async google(
    @Body() body: GoogleAuthDto,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('x-real-ip') realIp?: string,
  ) {
    const identifier =
      realIp?.split(',')[0]?.trim() ||
      forwardedFor?.split(',')[0]?.trim() ||
      'google-oauth';

    await this.rateLimitService.assertAllowed({
      namespace: 'auth-google',
      identifier,
      limit: 8,
      window: '10 m',
    });

    return this.authService.googleAuth(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @CurrentUser() user: RequestUser,
    @Headers('authorization') authorization?: string,
  ) {
    const profile = await this.authService.me(user.id);
    return {
      ...profile,
      accessToken: authorization?.replace(/^Bearer\s+/i, '') ?? '',
    };
  }
}
