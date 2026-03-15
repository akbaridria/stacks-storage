"use client";

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";
import { APP_NAME, APP_ICON } from "@/lib/constants";

interface WalletState {
  address: string | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  address: null,
  connected: false,
  connect: () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  // Defer loading @stacks/connect until after the wallet extension has set
  // window.StacksProvider, to avoid "Cannot redefine property: StacksProvider".
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      import("@stacks/connect").then(({ getOrCreateUserSession }) => {
        if (cancelled) return;
        const userSession = getOrCreateUserSession();
        if (userSession.isUserSignedIn()) {
          const userData = userSession.loadUserData();
          const addr =
            userData.profile?.stxAddress?.testnet ??
            userData.profile?.stxAddress?.mainnet ??
            null;
          setAddress(addr);
        }
      }).catch(() => {});
    }, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const connect = useCallback(() => {
    import("@stacks/connect").then(({ showConnect, getOrCreateUserSession }) => {
      const userSession = getOrCreateUserSession();
      showConnect({
        appDetails: { name: APP_NAME, icon: APP_ICON },
        onFinish: () => {
          const userData = userSession.loadUserData();
          const addr =
            userData.profile?.stxAddress?.testnet ??
            userData.profile?.stxAddress?.mainnet ??
            null;
          setAddress(addr);
        },
        userSession,
      });
    });
  }, []);

  const disconnect = useCallback(() => {
    import("@stacks/connect").then(({ getOrCreateUserSession }) => {
      getOrCreateUserSession().signUserOut();
    });
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider value={{ address, connected: !!address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
