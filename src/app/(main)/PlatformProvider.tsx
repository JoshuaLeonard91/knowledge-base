'use client';

import { createContext, useContext, ReactNode } from 'react';

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

export function usePlatform() {
  return useContext(PlatformContext);
}
