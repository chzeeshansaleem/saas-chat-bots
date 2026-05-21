import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email is already registered.');

    const slug = dto.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        memberships: {
          create: {
            role: 'ADMIN',
            tenant: { create: { name: dto.tenantName, slug: `${slug}-${Date.now()}` } },
          },
        },
      },
      include: { memberships: { include: { tenant: true } } },
    });

    return this.issueTokens(user.id, user.email, user.memberships[0].tenantId);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { memberships: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.issueTokens(user.id, user.email, user.memberships[0]?.tenantId);
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { memberships: true } });
    if (!user?.refreshHash || !(await bcrypt.compare(refreshToken, user.refreshHash))) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    return this.issueTokens(user.id, user.email, user.memberships[0]?.tenantId);
  }

  private async issueTokens(userId: string, email: string, tenantId?: string) {
    const accessTtl = this.config.getOrThrow<string>('JWT_ACCESS_TTL');
    const refreshTtl = this.config.getOrThrow<string>('JWT_REFRESH_TTL');
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: accessTtl as never },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email },
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: refreshTtl as never },
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshHash: await bcrypt.hash(refreshToken, 12) },
    });
    return { accessToken, refreshToken, tenantId };
  }
}
