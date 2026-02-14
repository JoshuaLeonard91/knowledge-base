'use client';

import { createContext, type ReactNode } from 'react';

interface PlatformContextType {
  siteName: string;
}

const PlatformContext = createContext<PlatformContextType>({
  siteName: 'Support Portal',
});

export function PlatformProvider({
  children,
  siteName,
}: {
  children: ReactNode;
  siteName: string;
}) {
  return (
    <PlatformContext.Provider value={{ siteName }}>
      {children}
    </PlatformContext.Provider>
  );
}
