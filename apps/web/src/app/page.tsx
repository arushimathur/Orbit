"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useCircle } from "../context/CircleContext";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { circle, isLoading: isCircleLoading } = useCircle();

  useEffect(() => {
    if (isAuthLoading || (user && isCircleLoading)) return;
    if (!user) router.replace("/login");
    else if (!circle) router.replace("/circle");
    else router.replace("/map");
  }, [user, isAuthLoading, circle, isCircleLoading, router]);

  return null;
}
