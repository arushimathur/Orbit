import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Circle } from "@orbit/shared";

const ACTIVE_CIRCLE_KEY = "orbit_active_circle";

interface CircleContextValue {
  circle: Circle | null;
  isLoading: boolean;
  setActiveCircle: (circle: Circle) => Promise<void>;
  clearActiveCircle: () => Promise<void>;
}

const CircleContext = createContext<CircleContextValue | null>(null);

export function CircleProvider({ children }: { children: React.ReactNode }) {
  const [circle, setCircle] = useState<Circle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(ACTIVE_CIRCLE_KEY);
      if (stored) setCircle(JSON.parse(stored));
      setIsLoading(false);
    })();
  }, []);

  const value = useMemo<CircleContextValue>(
    () => ({
      circle,
      isLoading,
      setActiveCircle: async (next) => {
        await SecureStore.setItemAsync(ACTIVE_CIRCLE_KEY, JSON.stringify(next));
        setCircle(next);
      },
      clearActiveCircle: async () => {
        await SecureStore.deleteItemAsync(ACTIVE_CIRCLE_KEY);
        setCircle(null);
      },
    }),
    [circle, isLoading],
  );

  return <CircleContext.Provider value={value}>{children}</CircleContext.Provider>;
}

export function useCircle(): CircleContextValue {
  const ctx = useContext(CircleContext);
  if (!ctx) throw new Error("useCircle must be used within a CircleProvider");
  return ctx;
}
