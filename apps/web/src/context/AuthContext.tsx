"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LoginDto, PublicUser, RegisterDto } from "@fetchlocation/shared";
import * as api from "../api/endpoints";
import { tokenStore } from "../api/tokenStore";

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const accessToken = tokenStore.getAccessToken();
      if (!accessToken) {
        setIsLoading(false);
        return;
      }
      try {
        setUser(await api.me());
      } catch {
        tokenStore.clear();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (dto) => setUser((await api.login(dto)).user),
      register: async (dto) => setUser((await api.register(dto)).user),
      logout: () => {
        api.logout();
        setUser(null);
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
