const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type ApiOptions = RequestInit & { tenantId?: string; token?: string };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  if (options.tenantId) headers.set('x-tenant-id', options.tenantId);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed');
  }
  return payload.data ?? payload;
}
