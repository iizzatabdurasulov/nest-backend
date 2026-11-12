import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './admin.guard.js';
import { CurrentUser } from '../users/user.decorator.js';
import { LogInDto, RegisterDto } from './auth.dto.js';

import type { Request, Response } from 'express';
import {
  AuthOriginGuard,
  readRefreshCookie,
  refreshCookieName,
  refreshCookieOptions,
} from './session.js';

@Controller('auth')
@UseGuards(AuthOriginGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  admin(@CurrentUser() user: { userId: number; email: string; role: string }) {
    return user;
  }

  private sendSession(
    response: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(refreshCookieName, tokens.refreshToken, {
      ...refreshCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    return this.authService.refresh(readRefreshCookie(request));
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(readRefreshCookie(request));
    response.clearCookie(refreshCookieName, refreshCookieOptions());
    response.setHeader('Cache-Control', 'no-store');
    return { ok: true };
  }

  @Post('register')
  async signUp(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.sendSession(response, await this.authService.register(dto));
    // return {ok:true}
  }

  @Post('login')
  async signIn(
    @Body() dto: LogInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.sendSession(response, await this.authService.login(dto));
  }
}
