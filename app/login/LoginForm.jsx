"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeOtpCode } from "@/lib/customers/otp-login.mjs";
import styles from "./login.module.css";

const PHASE_EMAIL = "email";
const PHASE_CODE = "code";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState(PHASE_EMAIL);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (phase !== PHASE_CODE || resendSeconds <= 0) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [phase, resendSeconds]);

  async function sendCode() {
    setError("");
    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    setIsSubmitting(false);

    if (otpError) {
      setError("No pudimos enviar el código. Revisá el email o registrate si todavía no tenés cuenta.");
      return;
    }

    setPhase(PHASE_CODE);
    setCode("");
    setResendSeconds(60);
  }

  async function verifyCode() {
    const token = normalizeOtpCode(code);
    if (!token) {
      setError("Ingresá el código de 8 dígitos que te enviamos por email.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: "email" });

    setIsSubmitting(false);

    if (verifyError) {
      setError("Código inválido o vencido. Pedí uno nuevo e intentá otra vez.");
      return;
    }

    router.replace(next);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (phase === PHASE_CODE) {
      await verifyCode();
      return;
    }

    await sendCode();
  }

  function handleChangeEmail() {
    setPhase(PHASE_EMAIL);
    setCode("");
    setError("");
    setResendSeconds(0);
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h1 className={styles.title}>Iniciar sesión</h1>
      {justRegistered ? (
        <p className={styles.notice}>Cuenta creada. Ingresá tu email y te mandamos un código.</p>
      ) : null}
      {phase === PHASE_CODE ? (
        <p className={styles.notice}>Te enviamos un código de 8 dígitos a {email}.</p>
      ) : null}

      <label className={styles.field}>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={phase === PHASE_CODE || isSubmitting}
          required
        />
      </label>

      {phase === PHASE_CODE ? (
        <label className={styles.field}>
          <span>Código</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{8}"
            maxLength={8}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
            required
          />
        </label>
      ) : null}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? "Procesando..." : phase === PHASE_CODE ? "Verificar código" : "Enviar código"}
      </button>

      {phase === PHASE_CODE ? (
        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.textButton}
            onClick={sendCode}
            disabled={isSubmitting || resendSeconds > 0}
          >
            {resendSeconds > 0 ? `Reenviar código (${resendSeconds}s)` : "Reenviar código"}
          </button>
          <button type="button" className={styles.textButton} onClick={handleChangeEmail} disabled={isSubmitting}>
            Cambiar email
          </button>
        </div>
      ) : null}

      <p className={styles.altAction}>
        ¿No tenés cuenta? <Link href="/registro">Registrate</Link>
      </p>
    </form>
  );
}
