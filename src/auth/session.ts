import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { CookieOptions, Request } from 'express';

export const refreshCookieName = 'refreshToken';
export const frontendOrigin = () =>
  process.env.FRONTEND_URL || 'http://localhost:3000';
export const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/auth',
});

export function readRefreshCookie(request: Request): string | undefined {
  const value = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${refreshCookieName}=`))
    ?.slice(refreshCookieName.length + 1);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

@Injectable()
export class AuthOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    // Non-browser API clients may omit Origin; cross-origin browser writes are rejected.
    if (
      request.method !== 'GET' &&
      request.headers.origin &&
      request.headers.origin !== frontendOrigin()
    ) {
      throw new ForbiddenException('Untrusted origin');
    }
    return true;
  }
}
