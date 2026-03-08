import { createContext, useContext, useState } from 'react';

const ImpersonationContext = createContext(null);

export function ImpersonationProvider({ children }) {
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  const startImpersonation = (userProfile) => {
    setImpersonatedUser(userProfile);
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
  };

  // This is the key — always returns the correct user ID for queries
  const effectiveUserId = impersonatedUser?.id || null;

  return (
    <ImpersonationContext.Provider value={{
      impersonatedUser,
      startImpersonation,
      stopImpersonation,
      effectiveUserId
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonation must be used inside ImpersonationProvider');
  return ctx;
}