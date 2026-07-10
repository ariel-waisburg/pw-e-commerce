# Panel de Admin (Productos) + API Interna Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal, functional admin backoffice for Products (login + CRUD) on top of the Supabase Auth layer already modeled in `supabase/schema.sql`, plus an internal REST API (`/api/products`, `/api/admin/products`) that both powers the admin panel and backs the public catalog.

**Architecture:** Route Handlers under `app/api/products` (public) and `app/api/admin/products` (session-gated) sit on top of two service modules — the existing `lib/supabase/queries/products.js` for public reads, and a new `lib/products/admin-service.js` for admin CRUD. Admin auth uses `@supabase/ssr` cookie-based sessions checked against the `admin_users` table. The admin UI (`/admin/login`, `/admin/productos*`) is client components that `fetch()` the admin API, sharing one Zod schema (`lib/products/admin-schema.mjs`) for both client-side and server-side validation.

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/ssr` + `@supabase/supabase-js`, Zod v4, `node --test` for unit tests. No new dependencies.

## Global Constraints

- Reuse existing components/patterns; do not change the tech stack or add dependencies (AGENTS.md).
- Use CSS custom properties from `app/globals.css` for color/radius/spacing — no hardcoded design values beyond what has no existing token.
- Run lint, unit tests, and `npm run build` after each task that touches buildable code (AGENTS.md).
- Verify responsive layout at 375/768/1024/1440px for any new page (AGENTS.md) — applies to Tasks 4, 5, 6.
- Follow the spec at `docs/superpowers/specs/2026-07-08-admin-productos-api-interna-design.md`. Orders management, git/PR workflow, the production payment routing fix, checkout live validation, and Navbar search are explicitly out of scope for this plan.

---

### Task 1: Admin product validation schema

**Files:**
- Create: `lib/products/admin-schema.mjs`
- Test: `lib/products/admin-schema.test.mjs`

**Interfaces:**
- Produces: `parseAdminProductInput(input: object) -> { success: boolean, data: object|null, error: { field: string|null, message: string }|null }`, plus the raw `adminProductSchema` and `adminVariantSchema` Zod schemas, all exported from `lib/products/admin-schema.mjs`.

- [ ] **Step 1: Write the failing tests**

Create `lib/products/admin-schema.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAdminProductInput } from "./admin-schema.mjs";

const validInput = {
  name: "Sleep Air Hybrid",
  slug: "sleep-air-hybrid",
  skuBase: "SAH",
  tagline: "Híbrido con resortes pocket",
  shortDescription: "Colchón híbrido",
  longDescription: "Descripción larga del colchón híbrido.",
  status: "active",
  isFeatured: false,
  variants: [
    { sku: "SAH-Q", title: "Queen 160x200", priceCents: 9900000, compareAtPriceCents: 10500000, stockQuantity: 5 },
  ],
};

test("accepts a valid product payload", () => {
  const result = parseAdminProductInput(validInput);
  assert.equal(result.success, true);
  assert.equal(result.data.slug, "sleep-air-hybrid");
  assert.equal(result.data.variants.length, 1);
});

test("rejects a missing name", () => {
  const result = parseAdminProductInput({ ...validInput, name: "" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "name");
});

test("rejects an invalid slug format", () => {
  const result = parseAdminProductInput({ ...validInput, slug: "Sleep Air Hybrid!" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "slug");
});

test("rejects an empty variants array", () => {
  const result = parseAdminProductInput({ ...validInput, variants: [] });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "variants");
});

test("rejects a negative variant price", () => {
  const result = parseAdminProductInput({
    ...validInput,
    variants: [{ ...validInput.variants[0], priceCents: -100 }],
  });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "variants.0.priceCents");
});

test("coerces numeric-string variant fields", () => {
  const result = parseAdminProductInput({
    ...validInput,
    variants: [{ ...validInput.variants[0], priceCents: "9900000", stockQuantity: "5" }],
  });
  assert.equal(result.success, true);
  assert.equal(result.data.variants[0].priceCents, 9900000);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/products/admin-schema.test.mjs`
Expected: FAIL — `Cannot find module './admin-schema.mjs'`

- [ ] **Step 3: Write the implementation**

Create `lib/products/admin-schema.mjs`:

```js
import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const adminVariantSchema = z.object({
  id: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1, "Ingresá un SKU"),
  title: z.string().trim().min(1, "Ingresá un título de variante"),
  priceCents: z.coerce
    .number()
    .int("El precio debe ser un número entero")
    .min(0, "El precio no puede ser negativo"),
  compareAtPriceCents: z.coerce
    .number()
    .int("El precio comparado debe ser un número entero")
    .min(0, "El precio comparado no puede ser negativo")
    .optional(),
  stockQuantity: z.coerce
    .number()
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo"),
});

export const adminProductSchema = z.object({
  name: z.string().trim().min(2, "Ingresá un nombre"),
  slug: z
    .string()
    .trim()
    .min(2, "Ingresá un slug")
    .regex(slugPattern, "El slug solo puede tener minúsculas, números y guiones"),
  skuBase: z.string().trim().min(1, "Ingresá un SKU base"),
  tagline: z.string().trim().max(160, "La bajada es demasiado larga").optional(),
  shortDescription: z.string().trim().max(500, "La descripción corta es demasiado larga").optional(),
  longDescription: z.string().trim().max(4000, "La descripción larga es demasiado larga").optional(),
  status: z.enum(["draft", "active", "archived"]),
  isFeatured: z.boolean().default(false),
  variants: z.array(adminVariantSchema).min(1, "Agregá al menos una variante"),
});

export function parseAdminProductInput(input) {
  const result = adminProductSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data, error: null };
  }

  const issue = result.error.issues[0];
  return {
    success: false,
    data: null,
    error: {
      field: issue?.path?.join(".") ?? null,
      message: issue?.message ?? "No se pudo validar el producto",
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test lib/products/admin-schema.test.mjs`
Expected: PASS — 6 tests, 0 failures

- [ ] **Step 5: Commit**

```bash
git add lib/products/admin-schema.mjs lib/products/admin-schema.test.mjs
git commit -m "feat(admin): add shared Zod schema for product validation"
```

---

### Task 2: Public products API route

**Files:**
- Create: `app/api/products/route.js`

**Interfaces:**
- Consumes: `getCatalogProducts({ limit }) -> Promise<Array>` from `lib/supabase/queries/products.js` (already exists, unchanged).
- Produces: `GET /api/products?limit=<n>` -> `{ products: Array }` (same row shape `getCatalogProducts` already returns — the shape `mapSupabaseProductToCardData` in `lib/products/mappers.js` consumes).

- [ ] **Step 1: Write the route**

Create `app/api/products/route.js`:

```js
import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/supabase/queries/products";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 48;

  try {
    const products = await getCatalogProducts({ limit });
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify manually**

Start the dev server (`npm run dev`), then run:

```bash
curl -s http://localhost:3000/api/products | head -c 300
```

Expected: JSON starting with `{"products":[{"id":"...","slug":"...","name":"...",...`

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors on the new file

- [ ] **Step 4: Commit**

```bash
git add app/api/products/route.js
git commit -m "feat(api): add public GET /api/products route"
```

---

### Task 3: Admin service layer, auth helper, and admin API routes

**Files:**
- Create: `lib/products/admin-service.js`
- Create: `lib/supabase/admin-auth.js`
- Create: `app/api/admin/products/route.js`
- Create: `app/api/admin/products/[id]/route.js`

**Interfaces:**
- Consumes: `parseAdminProductInput` from Task 1 (`lib/products/admin-schema.mjs`); `getSupabaseServiceRole()` from `lib/supabase/server.js` (existing); `publicEnv` from `lib/env/public.js` (existing).
- Produces:
  - `lib/products/admin-service.js`: `listAdminProducts()`, `getAdminProductById(id)`, `createAdminProduct(data)`, `updateAdminProduct(id, data)`, `deleteAdminProduct(id)` — all `async`, all resolving to the row shape `{ id, slug, sku_base, name, tagline, short_description, long_description, status, is_featured, created_at, updated_at, variants: [{ id, sku, title, price_cents, compare_at_price_cents, currency_code, stock_quantity }] }` (or `null`/`void` where noted).
  - `lib/supabase/admin-auth.js`: `getAdminSession() -> Promise<{ user, role } | null>`, `requireAdminSession() -> Promise<{ session: object|null, response: NextResponse|null }>`.
  - Routes: `GET/POST /api/admin/products`, `GET/PATCH/DELETE /api/admin/products/[id]`, all 401 without an admin session.

No automated test for this task: like the existing `lib/cart/server.js`, `lib/orders/server.js`, and `lib/mercadopago/server.js`, these files call Supabase directly via the service-role client using the `@/` path alias, which `node --test` cannot resolve without the Next.js bundler. Verification is manual, via `curl`, matching how the rest of the codebase's DB-touching modules are handled.

- [ ] **Step 1: Write the admin auth helper**

Create `lib/supabase/admin-auth.js`:

```js
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env/public";
import { getSupabaseServiceRole } from "@/lib/supabase/server";

async function createAdminSessionClient() {
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

export async function getAdminSession() {
  const supabase = await createAdminSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: adminRow } = await getSupabaseServiceRole()
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) return null;

  return { user, role: adminRow.role };
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  return { session, response: null };
}
```

- [ ] **Step 2: Write the admin service layer**

Create `lib/products/admin-service.js`:

```js
import { getSupabaseServiceRole } from "@/lib/supabase/server";

const ADMIN_PRODUCT_SELECT = `
  id,
  slug,
  sku_base,
  name,
  tagline,
  short_description,
  long_description,
  status,
  is_featured,
  created_at,
  updated_at,
  variants:product_variants (
    id,
    sku,
    title,
    price_cents,
    compare_at_price_cents,
    currency_code,
    stock_quantity
  )
`;

function toProductRow(input) {
  return {
    name: input.name,
    slug: input.slug,
    sku_base: input.skuBase,
    tagline: input.tagline || null,
    short_description: input.shortDescription || null,
    long_description: input.longDescription || null,
    status: input.status,
    is_featured: input.isFeatured,
  };
}

function toVariantRows(productId, variants) {
  return variants.map((variant) => ({
    product_id: productId,
    sku: variant.sku,
    title: variant.title,
    price_cents: variant.priceCents,
    compare_at_price_cents: variant.compareAtPriceCents ?? null,
    stock_quantity: variant.stockQuantity,
  }));
}

export async function listAdminProducts() {
  const { data, error } = await getSupabaseServiceRole()
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminProductById(id) {
  const { data, error } = await getSupabaseServiceRole()
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createAdminProduct(input) {
  const supabase = getSupabaseServiceRole();

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert(toProductRow(input))
    .select("id")
    .single();

  if (productError) {
    if (productError.code === "23505") {
      throw new Error("Ya existe un producto con ese slug");
    }
    throw new Error(productError.message);
  }

  const { error: variantsError } = await supabase
    .from("product_variants")
    .insert(toVariantRows(product.id, input.variants));

  if (variantsError) throw new Error(variantsError.message);

  return getAdminProductById(product.id);
}

export async function updateAdminProduct(id, input) {
  const supabase = getSupabaseServiceRole();

  const { error: productError } = await supabase.from("products").update(toProductRow(input)).eq("id", id);
  if (productError) {
    if (productError.code === "23505") {
      throw new Error("Ya existe un producto con ese slug");
    }
    throw new Error(productError.message);
  }

  const { error: deleteError } = await supabase.from("product_variants").delete().eq("product_id", id);
  if (deleteError) throw new Error(deleteError.message);

  const { error: variantsError } = await supabase
    .from("product_variants")
    .insert(toVariantRows(id, input.variants));

  if (variantsError) throw new Error(variantsError.message);

  return getAdminProductById(id);
}

export async function deleteAdminProduct(id) {
  const { error } = await getSupabaseServiceRole().from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 3: Write the admin products collection route**

Create `app/api/admin/products/route.js`:

```js
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/supabase/admin-auth";
import { createAdminProduct, listAdminProducts } from "@/lib/products/admin-service";
import { parseAdminProductInput } from "@/lib/products/admin-schema.mjs";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const products = await listAdminProducts();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const payload = await request.json().catch(() => null);
  const parsed = parseAdminProductInput(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message, field: parsed.error.field }, { status: 400 });
  }

  try {
    const product = await createAdminProduct(parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write the admin single-product route**

Create `app/api/admin/products/[id]/route.js`:

```js
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/supabase/admin-auth";
import { deleteAdminProduct, getAdminProductById, updateAdminProduct } from "@/lib/products/admin-service";
import { parseAdminProductInput } from "@/lib/products/admin-schema.mjs";

export async function GET(request, { params }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const product = await getAdminProductById(id);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(request, { params }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = parseAdminProductInput(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message, field: parsed.error.field }, { status: 400 });
  }

  try {
    const product = await updateAdminProduct(id, parsed.data);
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;

  try {
    await deleteAdminProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Verify the auth gate manually**

Start the dev server if it isn't running (`npm run dev`), then run:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/products
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/admin/products
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/products/00000000-0000-0000-0000-000000000000
```

Expected: `401` for all three (no session cookie sent). Full CRUD behavior with a real session is verified in Task 6 once the login UI exists.

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: no errors on the new files

- [ ] **Step 7: Commit**

```bash
git add lib/products/admin-service.js lib/supabase/admin-auth.js app/api/admin/products/route.js "app/api/admin/products/[id]/route.js"
git commit -m "feat(admin): add admin auth helper, product service, and admin API routes"
```

---

### Task 4: Admin login page and gated products list

**Files:**
- Create: `app/admin/login/page.js`
- Create: `app/admin/login/login.module.css`
- Create: `app/admin/(dashboard)/layout.js`
- Create: `app/admin/(dashboard)/admin.module.css`
- Create: `app/admin/(dashboard)/productos/page.js`
- Create: `app/admin/(dashboard)/productos/productos.module.css`

**Interfaces:**
- Consumes: `getAdminSession()` from `lib/supabase/admin-auth.js` (Task 3, server-side gate); `getSupabaseBrowserClient()` from `lib/supabase/client.js` (existing, client-side login); `GET /api/admin/products` (Task 3).
- Produces: `/admin/login` (public route, outside the auth gate) and `/admin/productos` (gated — redirects to `/admin/login` without a session).

Route groups: `app/admin/login/` sits **outside** `app/admin/(dashboard)/`, so the login page itself is never wrapped by the auth-gating layout — otherwise a logged-out visit to `/admin/login` would redirect to itself in a loop. `(dashboard)` does not appear in the URL; `/admin/productos` resolves correctly.

- [ ] **Step 1: Create the first admin user manually**

In Supabase Studio (the project referenced by `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`):

1. Authentication → Users → Add user. Set an email and password you'll remember.
2. Copy the new user's UUID.
3. SQL Editor → run (replacing the UUID):

```sql
insert into public.admin_users (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'admin');
```

This only needs to happen once per Supabase project.

- [ ] **Step 2: Write the login page**

Create `app/admin/login/page.js`:

```jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
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

    router.replace("/admin/productos");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Ingresar al admin</h1>
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
      </form>
    </main>
  );
}
```

Create `app/admin/login/login.module.css`:

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
```

- [ ] **Step 3: Write the gated dashboard layout**

Create `app/admin/(dashboard)/layout.js`:

```jsx
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/supabase/admin-auth";
import styles from "./admin.module.css";

export default async function AdminDashboardLayout({ children }) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Sleep Admin</span>
        <nav className={styles.nav}>
          <a href="/admin/productos">Productos</a>
        </nav>
        <span className={styles.userEmail}>{session.user.email}</span>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
```

Create `app/admin/(dashboard)/admin.module.css`:

```css
.shell {
  min-height: 100vh;
  background: var(--color-surface-alt);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-primary);
  color: var(--color-surface);
}

.brand {
  font-weight: 700;
}

.nav {
  display: flex;
  gap: var(--space-md);
  flex: 1;
}

.nav a {
  color: var(--color-surface);
  text-decoration: none;
  opacity: 0.85;
}

.nav a:hover {
  opacity: 1;
}

.userEmail {
  font-size: 0.85rem;
  opacity: 0.8;
}

.content {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-lg);
}
```

- [ ] **Step 4: Write the products list page**

Create `app/admin/(dashboard)/productos/page.js`:

```jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./productos.module.css";

export default function AdminProductsPage() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetch("/api/admin/products")
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los productos");
        return response.json();
      })
      .then((data) => {
        if (isMounted) setProducts(data.products);
      })
      .catch((fetchError) => {
        if (isMounted) setError(fetchError.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Productos</h1>
        <Link href="/admin/productos/nuevo" className={styles.newButton}>
          Nuevo producto
        </Link>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {!products && !error ? <p>Cargando...</p> : null}
      {products?.length === 0 ? <p>Todavía no hay productos cargados.</p> : null}

      {products?.length ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Estado</th>
              <th>Variantes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.slug}</td>
                <td>{product.status}</td>
                <td>{product.variants?.length ?? 0}</td>
                <td>
                  <Link href={`/admin/productos/${product.id}`}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
```

Create `app/admin/(dashboard)/productos/productos.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.title {
  margin: 0;
  color: var(--color-primary);
  font-size: 1.5rem;
}

.newButton {
  padding: 10px 18px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-surface);
  text-decoration: none;
  font-weight: 600;
}

.error {
  color: #b3261e;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table th,
.table td {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.table th {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table tr:last-child td {
  border-bottom: none;
}
```

- [ ] **Step 5: Verify manually in the browser**

1. In an incognito/logged-out browser, visit `http://localhost:3000/admin/productos`.
   Expected: redirected to `http://localhost:3000/admin/login`.
2. Log in with the admin user created in Step 1.
   Expected: redirected to `/admin/productos`, header shows your email, table shows "Todavía no hay productos cargados." (or existing products if the DB already has some).
3. Resize the browser to 375px and 1024px width.
   Expected: header and table remain usable, no horizontal overflow.

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: no errors on the new files

- [ ] **Step 7: Commit**

```bash
git add "app/admin/login" "app/admin/(dashboard)/layout.js" "app/admin/(dashboard)/admin.module.css" "app/admin/(dashboard)/productos/page.js" "app/admin/(dashboard)/productos/productos.module.css"
git commit -m "feat(admin): add login page and gated products list"
```

---

### Task 5: Admin product form and "new product" page

**Files:**
- Create: `components/admin/AdminProductForm.jsx`
- Create: `components/admin/AdminProductForm.module.css`
- Create: `app/admin/(dashboard)/productos/nuevo/page.js`

**Interfaces:**
- Consumes: `parseAdminProductInput` from `lib/products/admin-schema.mjs` (Task 1); `POST /api/admin/products` (Task 3).
- Produces: `AdminProductForm({ product?: object|null, productId?: string|null })` — a client component usable in both create mode (`product` and `productId` omitted) and edit mode (Task 6 passes both).

- [ ] **Step 1: Write the form component**

Create `components/admin/AdminProductForm.jsx`:

```jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseAdminProductInput } from "@/lib/products/admin-schema.mjs";
import styles from "./AdminProductForm.module.css";

const STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "active", label: "Activo" },
  { value: "archived", label: "Archivado" },
];

function emptyVariant() {
  return { sku: "", title: "", priceCents: "", compareAtPriceCents: "", stockQuantity: "" };
}

function toFormState(product) {
  if (!product) {
    return {
      name: "",
      slug: "",
      skuBase: "",
      tagline: "",
      shortDescription: "",
      longDescription: "",
      status: "draft",
      isFeatured: false,
      variants: [emptyVariant()],
    };
  }

  return {
    name: product.name ?? "",
    slug: product.slug ?? "",
    skuBase: product.sku_base ?? "",
    tagline: product.tagline ?? "",
    shortDescription: product.short_description ?? "",
    longDescription: product.long_description ?? "",
    status: product.status ?? "draft",
    isFeatured: Boolean(product.is_featured),
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      sku: variant.sku ?? "",
      title: variant.title ?? "",
      priceCents: String(variant.price_cents ?? ""),
      compareAtPriceCents: variant.compare_at_price_cents != null ? String(variant.compare_at_price_cents) : "",
      stockQuantity: String(variant.stock_quantity ?? ""),
    })),
  };
}

function buildPayload(formState) {
  return {
    name: formState.name,
    slug: formState.slug,
    skuBase: formState.skuBase,
    tagline: formState.tagline,
    shortDescription: formState.shortDescription,
    longDescription: formState.longDescription,
    status: formState.status,
    isFeatured: formState.isFeatured,
    variants: formState.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      sku: variant.sku,
      title: variant.title,
      priceCents: variant.priceCents,
      ...(variant.compareAtPriceCents ? { compareAtPriceCents: variant.compareAtPriceCents } : {}),
      stockQuantity: variant.stockQuantity,
    })),
  };
}

export default function AdminProductForm({ product = null, productId = null }) {
  const router = useRouter();
  const [formState, setFormState] = useState(() => toFormState(product));
  const [fieldError, setFieldError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(productId);

  function updateField(name, value) {
    setFormState((current) => ({ ...current, [name]: value }));
  }

  function updateVariant(index, name, value) {
    setFormState((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [name]: value } : variant
      ),
    }));
  }

  function addVariant() {
    setFormState((current) => ({ ...current, variants: [...current.variants, emptyVariant()] }));
  }

  function removeVariant(index) {
    setFormState((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldError(null);

    const payload = buildPayload(formState);
    const validation = parseAdminProductInput(payload);
    if (!validation.success) {
      setFieldError(validation.error);
      return;
    }

    setIsSaving(true);

    const endpoint = isEditing ? `/api/admin/products/${productId}` : "/api/admin/products";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const body = await response.json();

      if (!response.ok) {
        setFieldError({ field: body.field ?? null, message: body.error ?? "No se pudo guardar el producto" });
        setIsSaving(false);
        return;
      }

      router.push("/admin/productos");
      router.refresh();
    } catch {
      setFieldError({ field: null, message: "No se pudo guardar el producto" });
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEditing) return;
    if (!window.confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return;

    setIsSaving(true);
    const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setFieldError({ field: null, message: body.error ?? "No se pudo eliminar el producto" });
      setIsSaving(false);
      return;
    }

    router.push("/admin/productos");
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>Nombre</span>
        <input value={formState.name} onChange={(event) => updateField("name", event.target.value)} required />
        {fieldError?.field === "name" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
      </label>

      <label className={styles.field}>
        <span>Slug</span>
        <input value={formState.slug} onChange={(event) => updateField("slug", event.target.value)} required />
        {fieldError?.field === "slug" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
      </label>

      <label className={styles.field}>
        <span>SKU base</span>
        <input value={formState.skuBase} onChange={(event) => updateField("skuBase", event.target.value)} required />
        {fieldError?.field === "skuBase" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
      </label>

      <label className={styles.field}>
        <span>Bajada</span>
        <input value={formState.tagline} onChange={(event) => updateField("tagline", event.target.value)} />
      </label>

      <label className={styles.field}>
        <span>Descripción corta</span>
        <textarea
          rows="3"
          value={formState.shortDescription}
          onChange={(event) => updateField("shortDescription", event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Descripción larga</span>
        <textarea
          rows="6"
          value={formState.longDescription}
          onChange={(event) => updateField("longDescription", event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Estado</span>
        <select value={formState.status} onChange={(event) => updateField("status", event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={formState.isFeatured}
          onChange={(event) => updateField("isFeatured", event.target.checked)}
        />
        <span>Destacado</span>
      </label>

      <fieldset className={styles.variants}>
        <legend>Variantes</legend>
        {fieldError?.field?.startsWith("variants") ? (
          <em className={styles.fieldError}>{fieldError.message}</em>
        ) : null}

        {formState.variants.map((variant, index) => (
          <div className={styles.variantRow} key={index}>
            <input
              placeholder="SKU"
              value={variant.sku}
              onChange={(event) => updateVariant(index, "sku", event.target.value)}
              required
            />
            <input
              placeholder="Título (ej: Queen 160x200)"
              value={variant.title}
              onChange={(event) => updateVariant(index, "title", event.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Precio (centavos)"
              value={variant.priceCents}
              onChange={(event) => updateVariant(index, "priceCents", event.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Precio comparado (opcional)"
              value={variant.compareAtPriceCents}
              onChange={(event) => updateVariant(index, "compareAtPriceCents", event.target.value)}
            />
            <input
              type="number"
              placeholder="Stock"
              value={variant.stockQuantity}
              onChange={(event) => updateVariant(index, "stockQuantity", event.target.value)}
              required
            />
            <button type="button" onClick={() => removeVariant(index)} disabled={formState.variants.length === 1}>
              Quitar
            </button>
          </div>
        ))}

        <button type="button" className={styles.addVariant} onClick={addVariant}>
          Agregar variante
        </button>
      </fieldset>

      {fieldError && !fieldError.field ? <p className={styles.formError}>{fieldError.message}</p> : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
        {isEditing ? (
          <button type="button" className={styles.delete} onClick={handleDelete} disabled={isSaving}>
            Eliminar producto
          </button>
        ) : null}
      </div>
    </form>
  );
}
```

Create `components/admin/AdminProductForm.module.css`:

```css
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 640px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  color: var(--color-text-primary);
  font-weight: 600;
}

.field input,
.field textarea,
.field select {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  resize: vertical;
}

.checkboxField {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-text-primary);
  font-weight: 600;
}

.fieldError,
.formError {
  color: #b3261e;
  font-size: 0.85rem;
  font-style: normal;
}

.variants {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.variants legend {
  padding: 0 var(--space-xs);
  color: var(--color-text-secondary);
  font-weight: 600;
}

.variantRow {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr 1fr 1fr auto;
  gap: var(--space-sm);
}

.variantRow input {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  font: inherit;
}

.addVariant {
  align-self: flex-start;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
}

.actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-sm);
}

.submit {
  padding: 12px 24px;
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

.delete {
  padding: 12px 24px;
  border-radius: var(--radius-full);
  border: 1px solid #b3261e;
  background: transparent;
  color: #b3261e;
  font-weight: 600;
  cursor: pointer;
}
```

- [ ] **Step 2: Write the "new product" page**

Create `app/admin/(dashboard)/productos/nuevo/page.js`:

```jsx
import AdminProductForm from "@/components/admin/AdminProductForm";
import styles from "../productos.module.css";

export default function NewAdminProductPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Nuevo producto</h1>
      <AdminProductForm />
    </div>
  );
}
```

- [ ] **Step 3: Verify manually in the browser**

1. Logged in as admin, go to `/admin/productos/nuevo`.
2. Leave "Nombre" empty and submit.
   Expected: inline error under "Nombre" ("Ingresá un nombre"), no network request is made (client-side Zod check catches it before `fetch`).
3. Fill in a valid product (e.g. name "Producto de prueba", slug "producto-de-prueba", SKU base "TEST", one variant with SKU "TEST-1", title "Único", price 100000, stock 3) and submit.
   Expected: redirected to `/admin/productos`, the new product appears in the table.
4. Resize to 375px width.
   Expected: form fields stack, no horizontal overflow.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: no errors on the new files

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminProductForm.jsx components/admin/AdminProductForm.module.css "app/admin/(dashboard)/productos/nuevo/page.js"
git commit -m "feat(admin): add product create form"
```

---

### Task 6: Admin product edit page (edit + delete)

**Files:**
- Create: `app/admin/(dashboard)/productos/[id]/page.js`

**Interfaces:**
- Consumes: `getAdminProductById(id)` from `lib/products/admin-service.js` (Task 3); `AdminProductForm` from `components/admin/AdminProductForm.jsx` (Task 5), used with `product` and `productId` set.

- [ ] **Step 1: Write the edit page**

Create `app/admin/(dashboard)/productos/[id]/page.js`:

```jsx
import { notFound } from "next/navigation";
import AdminProductForm from "@/components/admin/AdminProductForm";
import { getAdminProductById } from "@/lib/products/admin-service";
import styles from "../productos.module.css";

export default async function EditAdminProductPage({ params }) {
  const { id } = await params;
  const product = await getAdminProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Editar producto</h1>
      <AdminProductForm product={product} productId={product.id} />
    </div>
  );
}
```

- [ ] **Step 2: Verify the full CRUD cycle manually in the browser**

1. From `/admin/productos`, click "Editar" on the test product created in Task 5.
   Expected: form pre-filled with its current values.
2. Change the name to "Producto de prueba (editado)" and the price to `150000`, submit.
   Expected: redirected to `/admin/productos`, updated name visible in the table.
3. Open the product again, click "Eliminar producto", confirm the browser dialog.
   Expected: redirected to `/admin/productos`, the product no longer appears in the table.
4. Confirm the row is really gone from the DB: `curl -s http://localhost:3000/api/products | grep -c "producto-de-prueba"` → expected `0`.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors on the new file

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/productos/[id]/page.js"
git commit -m "feat(admin): add product edit page with update and delete"
```

---

### Task 7: Documentation and final verification

**Files:**
- Modify: `README.md`

**Interfaces:** None — this task only documents and verifies work from Tasks 1–6.

- [ ] **Step 1: Document the admin panel in the README**

In `README.md`, after the "## Flujo de checkout implementado" section (before "## Configuración de Mercado Pago"), add:

```markdown
## Panel de admin

- `GET /admin/login`: login con email/password (Supabase Auth)
- `GET /admin/productos`: listado de productos (requiere sesión de admin)
- `GET /admin/productos/nuevo` y `GET /admin/productos/:id`: alta y edición de
  productos + variantes

### Crear el primer usuario admin

1. En Supabase Studio → Authentication → Users → Add user, creá un usuario
   con el email y contraseña que vas a usar para entrar al panel.
2. Copiá el UUID de ese usuario.
3. En SQL Editor, ejecutá (reemplazando el UUID):

   ```sql
   insert into public.admin_users (user_id, role)
   values ('<uuid-del-usuario>', 'admin');
   ```

Una vez hecho esto, ese usuario puede entrar en `/admin/login` con su email y
contraseña.

## API interna

- `GET /api/products`: catálogo público activo (usado por home y `/catalog`
  a través de la misma función de servicio, sin round-trip HTTP interno).
- `GET/POST /api/admin/products` y `GET/PATCH/DELETE /api/admin/products/:id`:
  CRUD de productos, requiere sesión de admin (`401` sin ella).
```

- [ ] **Step 2: Run the full verification suite**

```bash
npm run lint
node --test
npm run build
```

Expected: all three succeed with no errors.

- [ ] **Step 3: Manual end-to-end checklist**

- [ ] `curl -s http://localhost:3000/api/products | head -c 200` returns product JSON (public catalog API still works).
- [ ] Home (`/`) and `/catalog` still render products (unaffected by the admin work).
- [ ] Logged out, `/admin/productos` redirects to `/admin/login`.
- [ ] Full login → create → edit → delete cycle from Tasks 4–6 works end to end.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document admin panel and internal API in README"
```
