"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);

    if (signInError) {
      setError("Email o contraseña incorrectos");
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h1 className={styles.title}>Iniciar sesión</h1>
      {justRegistered ? <p className={styles.notice}>Cuenta creada, iniciá sesión.</p> : null}

      <label className={styles.field}>
        <span>Email</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>

      <label className={styles.field}>
        <span>Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? "Ingresando..." : "Ingresar"}
      </button>

      <p className={styles.altAction}>
        ¿No tenés cuenta? <Link href="/registro">Registrate</Link>
      </p>
    </form>
  );
}
