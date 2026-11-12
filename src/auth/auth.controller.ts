import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './admin.guard.js';
import { CurrentUser } from '../users/user.decorator.js';
import { LogInDto, RegisterDto } from './auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  admin(@CurrentUser() user: { userId: number; email: string; role: string }) {
    return user;
  }

  @Post('register')
  signUp(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
    // return {ok:true}
  }

  @Post('login')
  signIn(@Body() dto: LogInDto) {
    return this.authService.login(dto);
  }
}
