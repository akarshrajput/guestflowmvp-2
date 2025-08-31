'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';

export function Providers({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) {
  const queryClient = new QueryClient();
  
  return (
    <NextThemesProvider {...props}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-center" />
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
