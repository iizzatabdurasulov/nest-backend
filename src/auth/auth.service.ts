import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LogInDto, RegisterDto } from './auth.dto.js';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  //   Token generatsiya qilish
  private async generateToken(
    userId: number,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      }),

      this.jwtService.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async saveRefreshToken(userId: number, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: this.hashToken(refreshToken) },
    });
  }

  private async issueTokens(user: { email: string; role: string; id: number }) {
    const tokens = this.generateToken(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, (await tokens).refreshToken);

    return tokens;
  }

  private async verifyRefreshToken(token?: string): Promise<number> {
    if (!token) throw new UnauthorizedException('Session expired');
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(
        token,
        {
          secret: this.config.get('JWT_REFRESH_SECRET'),
        },
      );
      if (!Number.isInteger(payload.sub)) throw new Error('Invalid subject');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Session expired');
    }
  }

  async refresh(token?: string) {
    const userId = await this.verifyRefreshToken(token);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      // PrismaService hides this field by default; refresh must verify it internally.
      omit: { refreshTokenHash: false },
    });
    if (!user || user.refreshTokenHash !== this.hashToken(token!)) {
      throw new UnauthorizedException('Session expired');
    }
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: '1h' },
    );
    return { accessToken };
  }

  async logout(token?: string) {
    if (!token) return;
    let userId: number;
    try {
      userId = await this.verifyRefreshToken(token);
    } catch (error) {
      if (error instanceof UnauthorizedException) return;
      throw error;
    }
    await this.prisma.user.updateMany({
      where: { id: userId, refreshTokenHash: this.hashToken(token) },
      data: { refreshTokenHash: null },
    });
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('This email already registered');
    }

    // Parolni shifrlash

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
      },
    });

    return this.issueTokens(user);
  }

  async login(dto: LogInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      omit: { password: false },
    });

    if (!user) {
      throw new UnauthorizedException('User was not registered');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }
}
