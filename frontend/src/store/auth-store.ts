'use client';

import { create } from 'zustand';

type AuthState = {
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
  hasHydrated: boolean;
  hydrate: () => void;
  setAuth: (auth: { accessToken: string; refreshToken: string; tenantId?: string }) => void;
  setTenant: (tenantId: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  hasHydrated: false,
  hydrate: () => {
    set({
      accessToken: localStorage.getItem('accessToken') || undefined,
      refreshToken: localStorage.getItem('refreshToken') || undefined,
      tenantId: localStorage.getItem('tenantId') || undefined,
      hasHydrated: true,
    });
  },
  setAuth: (auth) => {
    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken);
    if (auth.tenantId) localStorage.setItem('tenantId', auth.tenantId);
    set({ ...auth, hasHydrated: true });
  },
  setTenant: (tenantId) => {
    localStorage.setItem('tenantId', tenantId);
    set({ tenantId, hasHydrated: true });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tenantId');
    set({ accessToken: undefined, refreshToken: undefined, tenantId: undefined, hasHydrated: true });
  },
}));
