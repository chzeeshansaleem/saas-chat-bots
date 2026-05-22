import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class DomainVerificationService {
  assertAllowed(domains: string[], origin?: string) {
    if (!domains.length) return;
    if (!origin) throw new ForbiddenException('Origin is required.');
    const hostname = new URL(origin).hostname.toLowerCase();
    const allowed = domains.some((domain) => {
      const normalized = normalizeDomain(domain);
      return normalized.startsWith('*.') ? hostname.endsWith(normalized.slice(1)) : hostname === normalized;
    });
    if (!allowed) throw new ForbiddenException('This domain is not allowed.');
  }
}

function normalizeDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  try {
    return new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
}
