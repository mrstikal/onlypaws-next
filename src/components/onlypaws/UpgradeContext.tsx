'use client';

import React, { createContext, useContext } from 'react';

type UpgradeContextValue = {
  openUpgrade?: () => void;
};

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function UpgradeProvider({
                                  openUpgrade,
                                  children,
                                }: {
  openUpgrade: () => void;
  children: React.ReactNode;
}) {
  return <UpgradeContext.Provider value={{openUpgrade}}>{children}</UpgradeContext.Provider>;
}

export function useUpgrade() {
  return useContext(UpgradeContext);
}
