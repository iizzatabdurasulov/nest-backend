import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role !== 'admin' && user?.role !== 'owner') {
      throw new ForbiddenException('Admin yoki owner huquqi kerak');
    }
    return true;
  }
}
