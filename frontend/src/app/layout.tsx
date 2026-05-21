import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthHydrator } from '@/components/auth/auth-hydrator';
import './globals.css';

export const metadata: Metadata = {
  title: 'Knowledge Chatbot Platform',
  description: 'Multi-tenant AI knowledge base chatbot dashboard',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthHydrator />
        {children}
      </body>
    </html>
  );
}
