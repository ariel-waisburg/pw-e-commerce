# Customer Auth (Registro, Login, Checkout con sesión) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the store real customer accounts — registration, login, logout, session visible in the header — and make checkout require a logged-in session, tying the cart and the resulting order to `customer_id`. Closes the cátedra correction "únicamente valida el mail."

**Architecture:** Mirrors the existing admin-auth pattern (`lib/supabase/admin-auth.js`, `app/admin/login/page.js`) with a customer-facing counterpart: a new `lib/supabase/customer-auth.js` session helper (cookie-based, `@supabase/ssr`), `/registro` and `/login` client pages that call Supabase Auth directly (`signUp` / `signInWithPassword`), and a small header widget (`AccountMenu`) that reads session state client-side so the static home page (`/`, currently `○ Static` in the build output) doesn't get forced into full dynamic rendering. Checkout (`app/checkout/page.js`, already dynamic) gains a server-side session redirect, and `createCheckoutPreferenceAction` gains a server-side session guard plus `customer_id` on the cart claim and the order insert. No new dependencies, no `middleware.js`.

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/ssr` + `@supabase/supabase-js` (both already dependencies), Zod v4, `node --test` for unit tests.

## Global Constraints

- Follow the spec at `docs/superpowers/specs/2026-07-10-customer-auth-design.md`. Password recovery, an address book, linking the cart by `customer_id` instead of guest cookie, and the "Mis pedidos" page are explicitly out of scope for this plan.
- Reuse existing components/patterns; do not change the tech stack or add dependencies (AGENTS.md).
- Use CSS custom properties from `app/globals.css` for color/radius/spacing — no hardcoded design values beyond what has no existing token.
- Run lint, unit tests, and `npm run build` after each task that touches buildable code (AGENTS.md).
- Verify responsive layout at 375/768/1024/1440px for any new page or header change (AGENTS.md) — applies to Tasks 2, 3, 4.
- Before starting: verify in the Supabase dashboard (Authentication → Settings → Email) whether "Confirm email" is enabled. If it is, `/registro` → `/login` won't work end to end without confirming by email first — either disable it for this project, or note it when doing the manual verification steps below.

---

### Task 1: Customer session helper + registration validation schema

**Files:**
- Create: `lib/customers/registration-schema.mjs`
- Test: `lib/customers/registration-schema.test.mjs`
- Create: `lib/supabase/customer-auth.js`

**Interfaces:**
- Produces (`lib/customers/registration-schema.mjs`): `parseRegistrationInput(input: object) -> { success: boolean, data: { fullName, email, password, confirmPassword } | null, error: { field: string|null, message: string } | null }`, plus the raw `registrationSchema` Zod schema.
- Produces (`lib/supabase/customer-auth.js`): `getCustomerSession() -> Promise<{ user: object } | null>`, `requireCustomerSession() -> Promise<{ session: { user: object } | null, error: Error | null }>`.
- No automated test for `customer-auth.js`: like `lib/supabase/admin-auth.js`, it calls Supabase directly via the `@/` path alias and `next/headers`, which `node --test` cannot resolve without the Next.js bundler. Verified manually in Tasks 3–5 once there's a UI to log in with.

- [ ] **Step 1: Write the failing tests**

Create `lib/customers/registration-schema.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegistrationInput } from "./registration-schema.mjs";

const validInput = {
  fullName: "Ariel Cliente",
  email: "cliente@example.com",
  password: "supersecreta",
  confirmPassword: "supersecreta",
};

test("accepts a valid registration payload", () => {
  const result = parseRegistrationInput(validInput);
  assert.equal(result.success, true);
  assert.equal(result.data.email, "cliente@example.com");
});

test("rejects a missing full name", () => {
  const result = parseRegistrationInput({ ...validInput, fullName: "" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "fullName");
});

test("rejects an invalid email", () => {
  const result = parseRegistrationInput({ ...validInput, email: "not-an-email" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "email");
});

test("rejects a short password", () => {
  const result = parseRegistrationInput({ ...validInput, password: "123", confirmPassword: "123" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "password");
});

test("rejects mismatched passwords", () => {
  const result = parseRegistrationInput({ ...validInput, confirmPassword: "otra-clave" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "confirmPassword");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/customers/registration-schema.test.mjs`
Expected: FAIL — `Cannot find module './registration-schema.mjs'`

- [ ] **Step 3: Write the registration schema**

Create `lib/customers/registration-schema.mjs`:

```js
import { z } from "zod";

export const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2, "Ingresá tu nombre"),
    email: z.string().trim().email("Ingresá un email válido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export function parseRegistrationInput(input) {
  const result = registrationSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data, error: null };
  }

  const issue = result.error.issues[0];
  return {
    success: false,
    data: null,
    error: {
      field: issue?.path?.join(".") ?? null,
      message: issue?.message ?? "No se pudo validar el registro",
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test lib/customers/registration-schema.test.mjs`
Expected: PASS — 5 tests, 0 failures

- [ ] **Step 5: Write the customer session helper**

Create `lib/supabase/customer-auth.js`:

```js
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env/public";

async function createCustomerSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, where cookies are read-only.
          // The session refresh is persisted on the next Route Handler request.
        }
      },
    },
  });
}

export async function getCustomerSession() {
  const supabase = await createCustomerSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { user };
}

export async function requireCustomerSession() {
  const session = await getCustomerSession();
  if (!session) {
    return { session: null, error: new Error("Iniciá sesión para completar la compra") };
  }

  return { session, error: null };
}
```

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: no errors on the new files

- [ ] **Step 7: Commit**

```bash
git add lib/customers/registration-schema.mjs lib/customers/registration-schema.test.mjs lib/supabase/customer-auth.js
git commit -m "feat(auth): add customer session helper and registration schema"
```

---

### Task 2: Registration page

**Files:**
- Create: `app/actions/customer.js`
- Create: `app/registro/page.js`
- Create: `app/registro/registro.module.css`

**Interfaces:**
- Consumes: `parseRegistrationInput` from `lib/customers/registration-schema.mjs` (Task 1); `getSupabaseBrowserClient()` from `lib/supabase/client.js` (existing); `getSupabaseServiceRole()` from `lib/supabase/server.js` (existing).
- Produces: `createCustomerProfileAction({ userId: string, fullName: string }) -> Promise<void>` (server action, throws on failure); route `/registro`.

- [ ] **Step 1: Write the server action that creates the `customers` row**

Create `app/actions/customer.js`:

```js
"use server";

import { getSupabaseServiceRole } from "@/lib/supabase/server";

export async function createCustomerProfileAction({ userId, fullName }) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { error } = await getSupabaseServiceRole()
    .from("customers")
    .upsert({ id: userId, full_name: fullName || null }, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }
}
```

Uses the service role (not the session-scoped client) because right after `supabase.auth.signUp()` there may not be an active session yet (if the Supabase project has "Confirm email" enabled), and the RLS policy `customers_insert_self` requires `auth.uid() = id` — which would fail with no session. `upsert` (instead of `insert`) makes this safe to retry.

- [ ] **Step 2: Write the registration page**

Create `app/registro/page.js`:

```jsx
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

        {fieldError && !fieldError.field ? <p className={styles.error}>{fieldError.message}</p> : null}

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
```

- [ ] **Step 3: Write the styles**

Create `app/registro/registro.module.css`:

```css
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--color-surface-alt);
}

.card {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.title {
  margin: 0 0 var(--space-sm);
  color: var(--color-primary);
  font-size: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  color: var(--color-text-primary);
  font-weight: 600;
}

.field input {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}

.fieldError,
.error {
  margin: 0;
  color: #b3261e;
  font-size: 0.85rem;
  font-style: normal;
}

.submit {
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-surface);
  font-weight: 600;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.altAction {
  margin: 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.altAction a {
  color: var(--color-accent-strong);
  font-weight: 600;
}
```

- [ ] **Step 4: Verify manually in the browser**

1. Start the dev server (`npm run dev`) if it isn't running.
2. Visit `http://localhost:3000/registro`.
3. Submit with an empty "Nombre".
   Expected: inline error "Ingresá tu nombre" under the field, no network request (client-side Zod check catches it first).
4. Fill in a valid account (e.g. name "Cliente de prueba", email `cliente-prueba@example.com`, password `supersecreta`, confirm the same) and submit.
   Expected: redirected to `/login?registered=1`.
5. In Supabase Studio → Table Editor → `customers`, confirm a row with that user's `id` and `full_name = "Cliente de prueba"` exists.
6. Resize the browser to 375px width.
   Expected: form fields stack, no horizontal overflow.

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors on the new files

- [ ] **Step 6: Commit**

```bash
git add app/actions/customer.js app/registro/page.js app/registro/registro.module.css
git commit -m "feat(auth): add customer registration page"
```

---

### Task 3: Login page

**Files:**
- Create: `app/login/page.js`
- Create: `app/login/LoginForm.jsx`
- Create: `app/login/login.module.css`

**Interfaces:**
- Consumes: `getSupabaseBrowserClient()` from `lib/supabase/client.js` (existing).
- Produces: route `/login`, accepts `?next=<path>` (defaults to `/`) and `?registered=1` (shows a confirmation banner).

`LoginForm` is split out as its own client component (instead of putting `useSearchParams` directly in `page.js`) and wrapped in `<Suspense>` from the page — `useSearchParams()` requires a Suspense boundary in the App Router, or Next.js fails the build with "should be wrapped in a suspense boundary". `/registro` (Task 2) doesn't need this because it doesn't read any query params.

- [ ] **Step 1: Write the login form**

Create `app/login/LoginForm.jsx`:

```jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
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

      {error ? <p className={styles.error}>{error}</p> : null}

      <button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? "Ingresando..." : "Ingresar"}
      </button>

      <p className={styles.altAction}>
        ¿No tenés cuenta? <Link href="/registro">Registrate</Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Write the page shell with the Suspense boundary**

Create `app/login/page.js`:

```jsx
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import styles from "./login.module.css";

export const metadata = {
  title: "Iniciar sesión | Sleep",
};

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 3: Write the styles**

Create `app/login/login.module.css`:

```css
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--color-surface-alt);
}

.card {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.title {
  margin: 0 0 var(--space-sm);
  color: var(--color-primary);
  font-size: 1.5rem;
}

.notice {
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);
  color: var(--color-primary);
  font-size: 0.85rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  color: var(--color-text-primary);
  font-weight: 600;
}

.field input {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}

.error {
  margin: 0;
  color: #b3261e;
  font-size: 0.9rem;
}

.submit {
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-surface);
  font-weight: 600;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.altAction {
  margin: 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.altAction a {
  color: var(--color-accent-strong);
  font-weight: 600;
}
```

- [ ] **Step 4: Verify manually in the browser**

1. Visit `http://localhost:3000/login`.
   Expected: form renders, no console errors about `useSearchParams`.
2. Log in with the account created in Task 2 (`cliente-prueba@example.com` / `supersecreta`).
   Expected: redirected to `/` (default `next`).
3. Visit `http://localhost:3000/login?next=/catalog&registered=1`.
   Expected: banner "Cuenta creada, iniciá sesión." is visible; after logging in, redirected to `/catalog` (not `/`).
4. Log in with a wrong password.
   Expected: "Email o contraseña incorrectos", stays on `/login`.
5. Resize to 375px width.
   Expected: form stacks correctly, no overflow.

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors on the new files

- [ ] **Step 6: Run build to confirm the Suspense boundary is correct**

Run: `npm run build`
Expected: succeeds, no "should be wrapped in a suspense boundary" error for `/login`

- [ ] **Step 7: Commit**

```bash
git add app/login
git commit -m "feat(auth): add customer login page"
```

---

### Task 4: Session-aware header (AccountMenu + logout)

**Files:**
- Create: `components/AccountMenu.jsx`
- Create: `components/AccountMenu.module.css`
- Modify: `components/Navbar.jsx:1-13` (imports) and the `.actions` block

**Interfaces:**
- Produces: `AccountMenu()` — a self-contained client component with no props. It fetches the Supabase session client-side (`supabase.auth.getUser()` on mount, `supabase.auth.onAuthStateChange` for live updates) rather than receiving it from a server-rendered parent.

**Why client-side and not server-rendered:** `app/layout.js` wraps every route, including `/` — which is currently the only statically-generated page in the app (`○ Static`, `revalidate: 1m`, confirmed via `npm run build` output). Reading `getCustomerSession()` in the root layout would call `cookies()` on every request, which forces the *entire* site (including the static home page) into dynamic rendering — a real performance regression for a change that's just "show login state in the header." Fetching the session in the browser inside `AccountMenu` avoids touching `app/layout.js` or `Navbar.jsx`'s render tree with server-side cookies at all; the tradeoff is a brief flash of the logged-out state on first paint, which is an acceptable, standard pattern for a header auth widget.

- [ ] **Step 1: Write the AccountMenu component**

Create `components/AccountMenu.jsx`:

```jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./AccountMenu.module.css";

export default function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setIsLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return (
      <div className={styles.menu}>
        <Link href="/login" className={styles.link}>
          Ingresar
        </Link>
        <Link href="/registro" className={`${styles.link} ${styles.registerLink}`}>
          Registrarme
        </Link>
      </div>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email;

  return (
    <div className={styles.menu}>
      <span className={styles.greeting}>Hola, {displayName}</span>
      <button type="button" className={styles.logout} onClick={handleLogout}>
        Salir
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write the styles**

Create `components/AccountMenu.module.css`:

```css
.menu {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.link {
  padding: 8px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.link:hover,
.link:focus-visible {
  border-color: var(--color-accent-strong);
  background: var(--color-accent-soft);
  outline: none;
}

.greeting {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.logout {
  padding: 8px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.logout:hover,
.logout:focus-visible {
  border-color: var(--color-accent-strong);
  background: var(--color-accent-soft);
  outline: none;
}

@media (max-width: 480px) {
  .registerLink {
    display: none;
  }

  .greeting {
    max-width: 84px;
  }
}
```

- [ ] **Step 3: Wire AccountMenu into the Navbar**

In `components/Navbar.jsx`, add the import after the existing `CartDrawer` import (line 12):

Old:
```jsx
import CartDrawer from "./CartDrawer";
import styles from "./Navbar.module.css";
```

New:
```jsx
import AccountMenu from "./AccountMenu";
import CartDrawer from "./CartDrawer";
import styles from "./Navbar.module.css";
```

Then, inside the `.actions` div, render `AccountMenu` as the first child, before the WhatsApp support link:

Old:
```jsx
          <div className={styles.actions}>
            <a
              href="https://wa.me/541139205184"
              className={styles.supportLink}
```

New:
```jsx
          <div className={styles.actions}>
            <AccountMenu />
            <a
              href="https://wa.me/541139205184"
              className={styles.supportLink}
```

- [ ] **Step 4: Verify manually in the browser**

1. Logged out (open an incognito window or `supabase.auth.signOut()` from the console), visit `http://localhost:3000/`.
   Expected: header shows "Ingresar" and "Registrarme" links.
2. Click "Ingresar", log in with the Task 2 account.
   Expected: redirected to `/`, header now shows "Hola, Cliente de prueba" and a "Salir" button, without a full page reload being required (the `onAuthStateChange` listener updates it, but `router.refresh()` from the login form also fires — both should agree).
3. Click "Salir".
   Expected: header reverts to "Ingresar" / "Registrarme".
4. Resize to 375px width.
   Expected: with a long name logged in, the greeting truncates with an ellipsis instead of overflowing; "Registrarme" is hidden at ≤480px when logged out, "Ingresar" stays visible; no horizontal scroll.
5. Confirm `/` is still statically generated: run `npm run build` and check the route table — `/` should still show `○` (Static), not `ƒ` (Dynamic).

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors on the new/modified files

- [ ] **Step 6: Commit**

```bash
git add components/AccountMenu.jsx components/AccountMenu.module.css components/Navbar.jsx
git commit -m "feat(auth): show session state and logout in the header"
```

---

### Task 5: Gate checkout behind session, associate cart and order to customer

**Files:**
- Modify: `app/checkout/page.js`
- Modify: `app/actions/checkout.js`

**Interfaces:**
- Consumes: `getCustomerSession()` and `requireCustomerSession()` from `lib/supabase/customer-auth.js` (Task 1).

No automated test: `app/actions/checkout.js` has no existing unit tests (it calls Supabase and Mercado Pago directly), matching the rest of the checkout/cart action files. Verified manually end to end.

- [ ] **Step 1: Gate the checkout page**

In `app/checkout/page.js`, add the imports:

Old:
```jsx
import Link from "next/link";
import { cookies } from "next/headers";
import CheckoutForm from "@/components/CheckoutForm";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken } from "@/lib/cart/server";
import styles from "./checkout.module.css";
```

New:
```jsx
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken } from "@/lib/cart/server";
import { getCustomerSession } from "@/lib/supabase/customer-auth";
import styles from "./checkout.module.css";
```

Then add the session check as the first line of the function body:

Old:
```jsx
export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cart = serializeCartRecord(await getCartByToken(token));
```

New:
```jsx
export default async function CheckoutPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/login?next=/checkout");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cart = serializeCartRecord(await getCartByToken(token));
```

- [ ] **Step 2: Guard the server action and claim the cart/order for the session**

In `app/actions/checkout.js`, add the import after the existing `getSupabaseServiceRole` import:

Old:
```js
import { getSupabaseServiceRole } from "@/lib/supabase/server";

const supabase = () => getSupabaseServiceRole();
```

New:
```js
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { requireCustomerSession } from "@/lib/supabase/customer-auth";

const supabase = () => getSupabaseServiceRole();
```

Add the session guard as the first line of `createCheckoutPreferenceAction`:

Old:
```js
export async function createCheckoutPreferenceAction(rawInput) {
  const parsed = checkoutSchema.safeParse(rawInput);
```

New:
```js
export async function createCheckoutPreferenceAction(rawInput) {
  const { session, error: sessionError } = await requireCustomerSession();
  if (sessionError) {
    throw sessionError;
  }

  const parsed = checkoutSchema.safeParse(rawInput);
```

Claim the cart for the session and set `customer_id` on the order. Replace:

Old:
```js
  const shippingAddress = formatAddress(parsed.data);
  const totalCents = cart.total_cents ?? 0;
  const subtotalCents = cart.subtotal_cents ?? 0;
  const shippingCents = cart.shipping_cents ?? 0;
  const discountCents = cart.discount_cents ?? 0;

  const { data: order, error: orderError } = await supabase()
    .from("orders")
    .insert({
      cart_id: cart.id,
      status: "pending",
```

New:
```js
  const shippingAddress = formatAddress(parsed.data);
  const totalCents = cart.total_cents ?? 0;
  const subtotalCents = cart.subtotal_cents ?? 0;
  const shippingCents = cart.shipping_cents ?? 0;
  const discountCents = cart.discount_cents ?? 0;

  const { error: cartClaimError } = await supabase()
    .from("carts")
    .update({ customer_id: session.user.id })
    .eq("id", cart.id);

  if (cartClaimError) {
    throw new Error(cartClaimError.message);
  }

  const { data: order, error: orderError } = await supabase()
    .from("orders")
    .insert({
      cart_id: cart.id,
      customer_id: session.user.id,
      status: "pending",
```

- [ ] **Step 3: Verify manually end to end**

1. Logged out, visit `http://localhost:3000/checkout`.
   Expected: redirected to `/login?next=/checkout`.
2. Log in with the Task 2 account.
   Expected: redirected back to `/checkout` (not `/`).
3. If the cart is empty, add a product to the cart first (e.g. from `/catalog`), then return to `/checkout`.
4. Fill in the checkout form and submit ("Ir a pagar").
   Expected: same behavior as before this change — order created, Mercado Pago preference created, redirected toward Mercado Pago.
5. In Supabase Studio → Table Editor → `orders`, confirm the newest row has `customer_id` set to the logged-in user's UUID (matches `auth.users`), and the corresponding row in `carts` also has `customer_id` set.

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/checkout/page.js app/actions/checkout.js
git commit -m "feat(auth): require login for checkout and associate orders with the customer"
```

---

### Task 6: Documentation and final verification

**Files:**
- Modify: `README.md`

**Interfaces:** None — this task only documents and verifies work from Tasks 1–5.

- [ ] **Step 1: Document customer accounts in the README**

In `README.md`, after the "## Panel de admin" section (before "## API interna"), add:

```markdown
## Cuentas de cliente

- `GET /registro`: alta de cuenta (nombre, email, contraseña) vía Supabase
  Auth. Crea también la fila correspondiente en `public.customers`.
- `GET /login`: login con email/contraseña. Acepta `?next=<path>` para volver
  a donde el usuario venía después de loguearse (usado por el checkout).
- El checkout (`/checkout`) requiere sesión iniciada; si no hay sesión,
  redirige a `/login?next=/checkout`.
- Al completar una compra, la orden y el carrito quedan asociados al
  `customer_id` del usuario logueado.

**Nota:** si el proyecto de Supabase tiene "Confirm email" activado
(Authentication → Settings → Email), un usuario recién registrado no puede
loguearse hasta confirmar el email. Para que el flujo registro → login sea
inmediato (recomendado para hacer la demo), desactivar esa opción.
```

- [ ] **Step 2: Run the full verification suite**

```bash
npm run lint
node --test
npm run build
```

Expected: all three succeed with no errors.

- [ ] **Step 3: Manual end-to-end checklist**

- [ ] `/` still renders and is listed as `○` (Static) in the `npm run build` route table.
- [ ] `/registro` creates an account and a matching `customers` row.
- [ ] `/login` logs in, respects `?next=`, shows the "Cuenta creada" banner after registering.
- [ ] Header shows "Ingresar/Registrarme" when logged out and "Hola, {nombre}" + "Salir" when logged in, at both 375px and 1280px.
- [ ] `/checkout` redirects to `/login?next=/checkout` when logged out, and returns to `/checkout` after logging in.
- [ ] A completed order has `customer_id` set on both `orders` and `carts`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document customer accounts in README"
```
