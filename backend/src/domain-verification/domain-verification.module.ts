import { Module } from '@nestjs/common';
import { DomainVerificationService } from './domain-verification.service';

@Module({
  providers: [DomainVerificationService],
  exports: [DomainVerificationService],
})
export class DomainVerificationModule {}
