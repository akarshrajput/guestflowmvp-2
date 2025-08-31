'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

export function AuthInitializer() {
  const { initializeAuth, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      await initializeAuth();
    };
    
    init();
  }, [initializeAuth]);

  return null;
}
