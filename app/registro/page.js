"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseRegistrationInput } from "@/lib/customers/registration-schema.mjs";
import { normalizeOtpCode } from "@/lib/customers/otp-login.mjs";
import { createCustomerProfileAction } from "@/app/actions/customer";
import styles from "./registro.module.css";

const INITIAL_FORM = { fullName: "", email: "" };
const PHASE_DETAILS = "details";
const PHASE_CODE = "code";

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState(PHASE_DETAILS);
  const [fieldError, setFieldError] = useState(null);
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

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function sendCode() {
    setFieldError(null);

    const validation = parseRegistrationInput(form);
    if (!validation.success) {
      setFieldError(validation.error);
      return;
    }

    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: validation.data.email,
      options: {
        data: { full_name: validation.data.fullName },
        shouldCreateUser: true,
      },
    });

    setIsSubmitting(false);

    if (otpError) {
      const rateLimited = otpError.status === 429 || /rate|limit/i.test(otpError.message ?? "");
      setFieldError({
        field: null,
        message: rateLimited
          ? "Esperá un minuto antes de pedir otro código."
          : "No se pudo enviar el código, probá de nuevo.",
      });
      return;
    }

    setPhase(PHASE_CODE);
    setCode("");
    setResendSeconds(60);
  }

  async function verifyCode() {
    const token = normalizeOtpCode(code);
    if (!token) {
      setFieldError({ field: "code", message: "Ingresá el código de 8 dígitos que te enviamos por email" });
      return;
    }

    setFieldError(null);
    setIsSubmitting(true);

    const validation = parseRegistrationInput(form);
    if (!validation.success) {
      setIsSubmitting(false);
      setPhase(PHASE_DETAILS);
      setFieldError(validation.error);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: validation.data.email,
      token,
      type: "email",
    });

    if (verifyError) {
      setIsSubmitting(false);
      setFieldError({ field: "code", message: "Código inválido o vencido. Pedí uno nuevo e intentá otra vez." });
      return;
    }

    try {
      await createCustomerProfileAction({ fullName: validation.data.fullName });
    } catch {
      setIsSubmitting(false);
      setFieldError({ field: null, message: "No se pudo completar el registro, probá de nuevo" });
      return;
    }

    setIsSubmitting(false);
    router.replace("/");
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
    setPhase(PHASE_DETAILS);
    setCode("");
    setFieldError(null);
    setResendSeconds(0);
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Crear cuenta</h1>
        {phase === PHASE_CODE ? (
          <p className={styles.notice}>Te enviamos un código de 8 dígitos a {form.email}.</p>
        ) : null}

        <label className={styles.field}>
          <span>Nombre</span>
          <input
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            disabled={phase === PHASE_CODE || isSubmitting}
            required
          />
          {fieldError?.field === "fullName" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
        </label>

        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            disabled={phase === PHASE_CODE || isSubmitting}
            required
          />
          {fieldError?.field === "email" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
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
            {fieldError?.field === "code" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
          </label>
        ) : null}

        {fieldError && !fieldError.field ? (
          <p className={styles.error} role="alert">
            {fieldError.message}
          </p>
        ) : null}

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
              Cambiar datos
            </button>
          </div>
        ) : null}

        <p className={styles.altAction}>
          ¿Ya tenés cuenta? <Link href="/login">Iniciá sesión</Link>
        </p>
      </form>
    </main>
  );
}
