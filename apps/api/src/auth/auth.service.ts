import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
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
}
