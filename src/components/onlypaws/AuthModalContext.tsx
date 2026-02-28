'use client';

import React, { createContext, useContext } from 'react';

type AuthModalContextValue = {
  openLogin: () => void;
  openRegister: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider(
  {
    openLogin,
    openRegister,
    children,
  }: {
    openLogin: () => void;
    openRegister: () => void;
    children: React.ReactNode;
  }) {

  return (
    <AuthModalContext.Provider value={{openLogin, openRegister}}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModals() {
  return useContext(AuthModalContext);
}

