import { ForbiddenException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class WidgetIdentityService {
  verifySignedUser(userId: string, email: string, signature: string, secret: string) {
    const expected = createHmac('sha256', secret).update(`${userId}${email}`).digest('hex');
    const left = Buffer.from(expected);
    const right = Buffer.from(signature);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new ForbiddenException('Invalid user signature.');
    }
  }
}
