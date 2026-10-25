import React, { createContext, useContext } from 'react';

export type DemoUserRole = 'admin' | 'user';

export interface DemoAdminContextValue {
  isAdmin: boolean;
  isLoading: boolean;
  user: { email: string | null; displayName: string | null } | null;
  role: DemoUserRole;
}

// Retain this compatibility context for the explicit local design profile.
// Account roles and permissions are resolved by the portal runtime/BFF.
// The portal does not initialize a separate Firebase/Google login session.
const DemoAdminContext = createContext<DemoAdminContextValue>({
  isAdmin: false,
  isLoading: false,
  user: null,
  role: 'user',
});

export const DemoAdminProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <DemoAdminContext.Provider
    value={{ isAdmin: false, isLoading: false, user: null, role: 'user' }}
  >
    {children}
  </DemoAdminContext.Provider>
);

export const useDemoAdmin = (): DemoAdminContextValue =>
  useContext(DemoAdminContext);

// Kept for existing local profile consumers; never used as a server grant.
export const isDemoAdminUser = (
  email: string | null | undefined,
  adminEmails: string[],
): boolean => !!email && adminEmails.includes(email);
