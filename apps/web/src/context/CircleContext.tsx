"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Circle } from "@fetchlocation/shared";

const ACTIVE_CIRCLE_KEY = "fetchlocation_active_circle";

interface CircleContextValue {
  circle: Circle | null;
  isLoading: boolean;
  setActiveCircle: (circle: Circle) => void;
  clearActiveCircle: () => void;
}

const CircleContext = createContext<CircleContextValue | null>(null);

export function CircleProvider({ children }: { children: React.ReactNode }) {
  const [circle, setCircle] = useState<Circle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(ACTIVE_CIRCLE_KEY);
    if (stored) setCircle(JSON.parse(stored));
    setIsLoading(false);
  }, []);

  const value = useMemo<CircleContextValue>(
    () => ({
      circle,
      isLoading,
      setActiveCircle: (next) => {
        window.localStorage.setItem(ACTIVE_CIRCLE_KEY, JSON.stringify(next));
        setCircle(next);
      },
      clearActiveCircle: () => {
        window.localStorage.removeItem(ACTIVE_CIRCLE_KEY);
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
