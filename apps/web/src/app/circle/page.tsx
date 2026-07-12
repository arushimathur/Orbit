"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useCircle } from "../../context/CircleContext";
import * as api from "../../api/endpoints";
import { ApiError } from "../../api/client";

export default function CircleSetupPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { circle, setActiveCircle } = useCircle();
  const [circleName, setCircleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) router.replace("/login");
    else if (circle) router.replace("/map");
  }, [user, isAuthLoading, circle, router]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await api.createCircle({ name: circleName });
      setActiveCircle(created);
      router.replace("/map");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onJoin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const joined = await api.joinCircle({ inviteCode: inviteCode.toUpperCase() });
      setActiveCircle(joined);
      router.replace("/map");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={styles.container}>
      <div style={styles.column}>
        <form style={styles.form} onSubmit={onCreate}>
          <h2 style={styles.title}>Start a circle</h2>
          <input
            style={styles.input}
            placeholder="Circle name (e.g. Family)"
            value={circleName}
            onChange={(e) => setCircleName(e.target.value)}
            required
          />
          <button style={styles.button} type="submit" disabled={isSubmitting || !circleName}>
            Create circle
          </button>
        </form>

        <form style={styles.form} onSubmit={onJoin}>
          <h2 style={styles.title}>Or join one</h2>
          <input
            style={styles.input}
            placeholder="8-character invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            maxLength={8}
            required
          />
          <button style={styles.button} type="submit" disabled={isSubmitting || inviteCode.length !== 8}>
            Join circle
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" },
  column: { width: 360, display: "flex", flexDirection: "column", gap: 32 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  title: { textAlign: "center", margin: 0 },
  input: { padding: 12, borderRadius: 8, border: "1px solid #ccc" },
  button: { padding: 12, borderRadius: 8, border: "none", background: "#2563eb", color: "white", fontWeight: 600 },
  error: { color: "crimson", textAlign: "center" },
};
