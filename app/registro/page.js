"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseRegistrationInput } from "@/lib/customers/registration-schema.mjs";
import { createCustomerProfileAction } from "@/app/actions/customer";
import styles from "./registro.module.css";

const INITIAL_FORM = { fullName: "", email: "", password: "", confirmPassword: "" };

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldError, setFieldError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldError(null);

    const validation = parseRegistrationInput(form);
    if (!validation.success) {
      setFieldError(validation.error);
      return;
    }

    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: { data: { full_name: validation.data.fullName } },
    });

    if (signUpError) {
      setIsSubmitting(false);
      const alreadyRegistered = /already/i.test(signUpError.message ?? "");
      setFieldError({
        field: null,
        message: alreadyRegistered
          ? "Ese email ya tiene una cuenta, iniciá sesión"
          : "No se pudo completar el registro, probá de nuevo",
      });
      return;
    }

    try {
      await createCustomerProfileAction({ userId: data.user.id, fullName: validation.data.fullName });
    } catch {
      setIsSubmitting(false);
      setFieldError({ field: null, message: "No se pudo completar el registro, probá de nuevo" });
      return;
    }

    setIsSubmitting(false);
    router.replace("/login?registered=1");
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Crear cuenta</h1>

        <label className={styles.field}>
          <span>Nombre</span>
          <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
          {fieldError?.field === "fullName" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
        </label>

        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            required
          />
          {fieldError?.field === "email" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            required
          />
          {fieldError?.field === "password" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
        </label>

        <label className={styles.field}>
          <span>Confirmar contraseña</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            required
          />
          {fieldError?.field === "confirmPassword" ? (
            <em className={styles.fieldError}>{fieldError.message}</em>
          ) : null}
        </label>

        {fieldError && !fieldError.field ? (
          <p className={styles.error} role="alert">
            {fieldError.message}
          </p>
        ) : null}

        <button type="submit" className={styles.submit} disabled={isSubmitting}>
          {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className={styles.altAction}>
          ¿Ya tenés cuenta? <Link href="/login">Iniciá sesión</Link>
        </p>
      </form>
    </main>
  );
}
