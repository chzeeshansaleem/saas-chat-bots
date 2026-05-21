'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const auth = await api<{ accessToken: string; refreshToken: string; tenantId?: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          tenantName: form.get('tenantName'),
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      setAuth(auth);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold">Create workspace</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input name="name" placeholder="Your name" required />
          <Input name="tenantName" placeholder="Business name" required />
          <Input name="email" type="email" placeholder="Email" required />
          <Input name="password" type="password" placeholder="Password" required minLength={8} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full">Create account</Button>
        </form>
      </Card>
    </main>
  );
}
