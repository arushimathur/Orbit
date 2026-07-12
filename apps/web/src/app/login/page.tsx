"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={styles.container}>
      <form style={styles.form} onSubmit={onSubmit}>
        <h1 style={styles.title}>FetchLocation</h1>
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
        <p style={styles.link}>
          No account? <Link href="/register">Create one</Link>
        </p>
      </form>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" },
  form: { width: 320, display: "flex", flexDirection: "column", gap: 12 },
  title: { textAlign: "center", marginBottom: 16 },
  input: { padding: 12, borderRadius: 8, border: "1px solid #ccc" },
  button: { padding: 12, borderRadius: 8, border: "none", background: "#2563eb", color: "white", fontWeight: 600 },
  error: { color: "crimson", margin: 0 },
  link: { textAlign: "center", fontSize: 14 },
};
