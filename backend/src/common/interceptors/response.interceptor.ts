import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): any {
    return (next.handle() as any).pipe(
      map((data) => ({
        success: true,
        data,
      })) as any,
    );
  }
}
