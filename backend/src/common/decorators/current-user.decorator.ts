import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUser = {
  sub: string;
  email: string;
  tenantId?: string;
  role?: 'ADMIN' | 'MEMBER';
};

export const CurrentUserDecorator = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentUser => {
  return ctx.switchToHttp().getRequest().user;
});
