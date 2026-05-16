import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { TransactionalMailService } from '../common/services/transactional-mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { syncBaselineSetup, toWorkspaceSlug } from './auth-provisioning';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(TransactionalMailService)
    private readonly mailService: TransactionalMailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { salon: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.createSession(user);
  }

  async register(payload: RegisterDto) {
    const email = payload.email.trim().toLowerCase();
    const name = payload.name.trim();
    const salonName = payload.salonName.trim();

    if (!salonName || !name) {
      throw new BadRequestException(
        'Preencha os dados obrigatorios do cadastro.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Ja existe uma conta com este e-mail.');
    }

    const slugBase = toWorkspaceSlug(salonName);

    if (!slugBase) {
      throw new BadRequestException('Nome do workspace invalido.');
    }

    const salonSlug = await this.generateUniqueSalonSlug(slugBase);
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const session = await this.prisma.$transaction(async (tx) => {
      const salon = await tx.salon.create({
        data: {
          name: salonName,
          slug: salonSlug,
          timezone: 'America/Sao_Paulo',
          brandColor: '#7FE8FF',
          welcomeMessage:
            'CRM, WhatsApp e IA no mesmo fluxo para recuperar clientes e acelerar conversao.',
        },
      });

      const user = await tx.user.create({
        data: {
          salonId: salon.id,
          name,
          email,
          passwordHash,
          role: 'owner',
        },
        include: { salon: true },
      });

      await syncBaselineSetup(tx, salon.id, user.id);

      return this.createSession(user);
    });

    return session;
  }

  async googleAuth(payload: GoogleAuthDto) {
    const { clientId, clientSecret } = this.getGoogleOAuthConfig();
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: payload.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: payload.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new UnauthorizedException(
        tokenPayload.error_description ||
          tokenPayload.error ||
          'Falha ao autenticar com Google.',
      );
    }

    const userInfoResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
        },
      },
    );

    const profile = (await userInfoResponse.json()) as {
      email?: string;
      name?: string;
      given_name?: string;
      email_verified?: boolean;
    };

    if (!userInfoResponse.ok || !profile.email || !profile.email_verified) {
      throw new UnauthorizedException(
        'Google nao retornou um perfil valido para concluir o acesso.',
      );
    }

    const email = profile.email.trim().toLowerCase();
    const googleName =
      profile.name?.trim() ||
      profile.given_name?.trim() ||
      email.split('@')[0] ||
      'Owner';
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: { salon: true },
    });

    if (existingUser) {
      return this.createSession(existingUser);
    }

    const salonSeedName =
      payload.salonName?.trim() ||
      `${profile.given_name?.trim() || googleName} Studio`;
    const salonSlug = await this.generateUniqueSalonSlug(
      toWorkspaceSlug(salonSeedName),
    );
    const randomPassword = randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const session = await this.prisma.$transaction(async (tx) => {
      const salon = await tx.salon.create({
        data: {
          name: salonSeedName,
          slug: salonSlug,
          timezone: 'America/Sao_Paulo',
          brandColor: '#7FE8FF',
          welcomeMessage:
            'CRM, WhatsApp e IA no mesmo fluxo para recuperar clientes e acelerar conversao.',
        },
      });

      const user = await tx.user.create({
        data: {
          salonId: salon.id,
          name: googleName,
          email,
          passwordHash,
          role: 'owner',
        },
        include: { salon: true },
      });

      await syncBaselineSetup(tx, salon.id, user.id);

      return this.createSession(user);
    });

    return session;
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { salon: true },
    });

    if (!user) {
      return { success: true as const };
    }

    const token = this.jwtService.sign(
      {
        sub: user.id,
        type: 'password-reset',
        fingerprint: this.buildPasswordResetFingerprint(user.passwordHash),
      },
      {
        expiresIn: '1h',
      },
    );
    const siteUrl =
      this.configService.get<string>('NEXT_PUBLIC_SITE_URL')?.trim() ||
      'https://salonzap-crm-web.vercel.app';
    const resetUrl = `${siteUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      salonName: user.salon.name,
      resetUrl,
    });

    return { success: true as const };
  }

  async resetPassword(payload: ResetPasswordDto) {
    let decoded: {
      sub: string;
      type: string;
      fingerprint: string;
    };

    try {
      decoded = this.jwtService.verify(payload.token.trim());
    } catch {
      throw new BadRequestException(
        'O link de redefinicao e invalido ou expirou.',
      );
    }

    if (decoded.type !== 'password-reset') {
      throw new BadRequestException(
        'O link de redefinicao e invalido ou expirou.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (
      !user ||
      decoded.fingerprint !==
        this.buildPasswordResetFingerprint(user.passwordHash)
    ) {
      throw new BadRequestException(
        'O link de redefinicao e invalido ou expirou.',
      );
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { success: true as const };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { salon: true },
    });

    if (!user) {
      throw new UnauthorizedException('Sessão inválida.');
    }

    return {
      user: this.serializeUser(user),
      salon: {
        id: user.salon.id,
        name: user.salon.name,
        slug: user.salon.slug,
        timezone: user.salon.timezone,
        welcomeMessage: user.salon.welcomeMessage,
      },
    };
  }

  private createSession(
    user: User & {
      salon: {
        id: string;
        name: string;
        slug: string;
        timezone: string;
        welcomeMessage: string | null;
      };
    },
  ) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      salonId: user.salonId,
    });

    return {
      accessToken,
      user: this.serializeUser(user),
      salon: {
        id: user.salon.id,
        name: user.salon.name,
        slug: user.salon.slug,
        timezone: user.salon.timezone,
        welcomeMessage: user.salon.welcomeMessage,
      },
    };
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      salonId: user.salonId,
    };
  }

  private async generateUniqueSalonSlug(baseSlug: string) {
    let attempt = 0;

    while (attempt < 25) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const existing = await this.prisma.salon.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) {
        return slug;
      }

      attempt += 1;
    }

    return `${baseSlug}-${Date.now().toString().slice(-6)}`;
  }

  private getGoogleOAuthConfig() {
    const clientId =
      this.configService.get<string>('GOOGLE_CLIENT_ID')?.trim() || '';
    const clientSecret =
      this.configService.get<string>('GOOGLE_CLIENT_SECRET')?.trim() || '';

    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'Login com Google ainda nao foi configurado em producao.',
      );
    }

    return {
      clientId,
      clientSecret,
    };
  }

  private buildPasswordResetFingerprint(passwordHash: string) {
    return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
  }
}
