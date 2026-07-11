# API REST de carrito/órdenes + "Mis pedidos" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a REST API for carrito y órdenes (mismo patrón que `/api/products`) y la página "Mis pedidos" para clientes logueados, sin tocar el comportamiento actual de `CartContext`/`CheckoutForm`.

**Architecture:** Se extrae la lógica de mutación del carrito, hoy inline en `app/actions/cart.js`, a un módulo compartido `lib/cart/mutations.js` (sin dependencia de cookies). Las server actions existentes se convierten en una capa fina sobre ese módulo (mismo comportamiento, cero regresión) y las rutas nuevas bajo `/api/cart` son otra capa fina sobre el mismo módulo — la cookie de invitado sigue siendo la fuente de identidad del carrito en ambos casos. Las rutas de `/api/orders` son de solo lectura, gateadas por `requireCustomerSession()` (ya existe en `lib/supabase/customer-auth.js`, mergeado a `Main`), y reusan `lib/orders/server.js`. La página `/mis-pedidos` llama a esa misma capa de servicio directo, server-side (no se auto-fetchea su propia API), mismo criterio que usa `/catalog` con el catálogo.

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/ssr` + `@supabase/supabase-js`, Zod v4, `node --test` para unit tests, sin dependencias nuevas.

## Global Constraints

- Sigue el spec en `docs/superpowers/specs/2026-07-11-cart-orders-api-design.md`. Gestión de órdenes en el admin, creación de orden vía API, migración del frontend a fetch, paginación de "Mis pedidos", y el fix del bug de rutas de pago en producción están fuera de alcance.
- Reusa componentes/patrones existentes; no cambia el stack ni agrega dependencias (AGENTS.md).
- Usa las custom properties de `app/globals.css` para color/radius/spacing — nada de valores hardcodeados donde ya exista un token.
- Corre lint, tests unitarios y `npm run build` después de cada tarea que toque código buildeable (AGENTS.md).
- Verifica el layout responsive a 375/768/1024/1440px para cualquier página o cambio de header nuevo (AGENTS.md) — aplica a las Tareas 5 y 6.
- Igual que en el resto del proyecto (`lib/cart/server.js`, `lib/products/admin-service.js`), no se agrega test unitario a funciones que solo orquestan llamadas de red a Supabase — se verifican manualmente.

---

### Task 1: Extraer la lógica de mutación del carrito a un módulo compartido

**Files:**
- Create: `lib/cart/cookie.js`
- Create: `lib/cart/mutations.js`
- Modify: `lib/cart/server.js` (agrega `getCartItemCartId`)
- Modify: `app/actions/cart.js` (pasa a ser una capa fina sobre `lib/cart/mutations.js`)

**Interfaces:**
- Consumes: `getCartByToken`, `recalculateCartTotals`, `refetchCart` de `lib/cart/server.js` (existentes); `serializeCartRecord` de `lib/cart/serializer.js` (existente); `getSupabaseServiceRole` de `lib/supabase/server.js` (existente); `CART_COOKIE_NAME`, `CART_COOKIE_MAX_AGE_SECONDS` de `lib/cart/constants.js` (existentes).
- Produces (`lib/cart/cookie.js`): `setCartCookie(cookieStore, token) -> void`.
- Produces (`lib/cart/server.js`, agregado): `getCartItemCartId(itemId: string) -> Promise<string | null>`.
- Produces (`lib/cart/mutations.js`): `ensureCartWithToken(token: string | undefined) -> Promise<{ cart: object, token: string }>` (cart es el registro crudo de Supabase, no serializado); `addItemToCart({ token, variantId, quantity? }) -> Promise<{ cart: object, token: string }>` (cart YA serializado); `updateCartItemQuantity({ itemId, quantity }) -> Promise<object>` (cart serializado); `removeCartItem({ itemId }) -> Promise<object>` (cart serializado); `clearCartByToken(token) -> Promise<object | null>` (cart serializado, `null` si no hay token o carrito).
- No hay cambio de comportamiento observable en `getCartAction`, `createCartAction`, `addItemToCartAction`, `updateCartItemQuantityAction`, `removeCartItemAction`, `clearCartAction` — mismos nombres, misma forma de datos, mismo flujo. Sin test automático (orquestación de red a Supabase, igual criterio que `lib/cart/server.js` hoy); se verifica con lint, build y una prueba manual del carrito en el navegador.

- [ ] **Step 1: Crear el helper de cookie**

Create `lib/cart/cookie.js`:

```js
import { CART_COOKIE_NAME, CART_COOKIE_MAX_AGE_SECONDS } from "@/lib/cart/constants";

export function setCartCookie(cookieStore, token) {
  cookieStore.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}
```

- [ ] **Step 2: Agregar `getCartItemCartId` a `lib/cart/server.js`**

En `lib/cart/server.js`, agregar al final del archivo (después de `recalculateCartTotals`):

```js
export async function getCartItemCartId(itemId) {
  if (!itemId) return null;

  const { data, error } = await supabase()
    .from("cart_items")
    .select("cart_id")
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.cart_id ?? null;
}
```

- [ ] **Step 3: Crear el módulo de mutaciones**

Create `lib/cart/mutations.js`:

```js
import { randomUUID } from "crypto";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken, recalculateCartTotals, refetchCart } from "@/lib/cart/server";

const supabase = () => getSupabaseServiceRole();

export async function ensureCartWithToken(token) {
  if (token) {
    const existing = await getCartByToken(token);
    if (existing) {
      return { cart: existing, token };
    }
  }

  const newToken = randomUUID();

  const { data, error } = await supabase()
    .from("carts")
    .insert({
      anonymous_key: newToken,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    const fallbackCart = await getCartByToken(newToken);
    if (!fallbackCart?.id) {
      throw new Error("Failed to create cart");
    }

    return { cart: fallbackCart, token: newToken };
  }

  const cartWithRelations = await refetchCart(data.id);

  return { cart: cartWithRelations ?? data, token: newToken };
}

export async function addItemToCart({ token, variantId, quantity = 1 }) {
  if (!variantId) {
    throw new Error("variantId is required");
  }

  if (quantity < 1) {
    quantity = 1;
  }

  const { cart, token: resolvedToken } = await ensureCartWithToken(token);
  const cartId = cart.id;

  const { data: variant, error: variantError } = await supabase()
    .from("product_variants")
    .select(
      `
      id,
      product_id,
      price_cents,
      compare_at_price_cents,
      currency_code,
      title,
      product:products!product_variants_product_id_fkey (
        id,
        name,
        slug
      )
    `
    )
    .eq("id", variantId)
    .maybeSingle();

  if (variantError) {
    throw new Error(variantError.message);
  }

  if (!variant) {
    throw new Error("Variante no encontrada");
  }

  const { data: existing } = await supabase()
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .maybeSingle();

  if (existing) {
    const newQty = existing.quantity + quantity;
    const { error: updateError } = await supabase()
      .from("cart_items")
      .update({
        quantity: newQty,
        unit_price_cents: variant.price_cents,
        currency_code: variant.currency_code,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await supabase().from("cart_items").insert({
      cart_id: cartId,
      product_id: variant.product_id,
      variant_id: variant.id,
      quantity,
      unit_price_cents: variant.price_cents,
      currency_code: variant.currency_code,
      metadata: {
        product_name: variant.product?.name,
        product_slug: variant.product?.slug,
      },
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  await recalculateCartTotals(cartId);
  const updated = await refetchCart(cartId);

  return { cart: serializeCartRecord(updated), token: resolvedToken };
}

export async function updateCartItemQuantity({ itemId, quantity }) {
  if (!itemId) throw new Error("itemId is required");
  if (!quantity || quantity < 1) throw new Error("quantity must be >= 1");

  const { data: item, error: itemError } = await supabase()
    .from("cart_items")
    .select("cart_id")
    .eq("id", itemId)
    .single();

  if (itemError) {
    throw new Error(itemError.message);
  }

  const { error: updateError } = await supabase()
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId);

  if (updateError) throw new Error(updateError.message);

  await recalculateCartTotals(item.cart_id);
  const updated = await refetchCart(item.cart_id);
  return serializeCartRecord(updated);
}

export async function removeCartItem({ itemId }) {
  if (!itemId) throw new Error("itemId is required");

  const { data: item, error: itemError } = await supabase()
    .from("cart_items")
    .select("cart_id")
    .eq("id", itemId)
    .single();

  if (itemError) {
    throw new Error(itemError.message);
  }

  const { error: deleteError } = await supabase().from("cart_items").delete().eq("id", itemId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await recalculateCartTotals(item.cart_id);
  const updated = await refetchCart(item.cart_id);
  return serializeCartRecord(updated);
}

export async function clearCartByToken(token) {
  if (!token) return null;

  const cart = await getCartByToken(token);
  if (!cart) return null;

  const { error } = await supabase().from("cart_items").delete().eq("cart_id", cart.id);
  if (error) throw new Error(error.message);

  await recalculateCartTotals(cart.id);
  const updated = await refetchCart(cart.id);
  return serializeCartRecord(updated);
}
```

- [ ] **Step 4: Refactorizar `app/actions/cart.js` para usar el módulo nuevo**

Replace the entire content of `app/actions/cart.js`:

```js
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken } from "@/lib/cart/server";
import { setCartCookie } from "@/lib/cart/cookie";
import {
  addItemToCart,
  clearCartByToken,
  ensureCartWithToken,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart/mutations";

export async function getCartAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const cart = await getCartByToken(token);
  return serializeCartRecord(cart);
}

export async function createCartAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  const { cart, token: resolvedToken } = await ensureCartWithToken(token);
  if (resolvedToken !== token) {
    setCartCookie(cookieStore, resolvedToken);
  }

  return serializeCartRecord(cart);
}

export async function addItemToCartAction({ variantId, quantity = 1 }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  const { cart, token: resolvedToken } = await addItemToCart({ token, variantId, quantity });
  if (resolvedToken !== token) {
    setCartCookie(cookieStore, resolvedToken);
  }

  revalidatePath("/");
  return cart;
}

export async function updateCartItemQuantityAction({ itemId, quantity }) {
  return updateCartItemQuantity({ itemId, quantity });
}

export async function removeCartItemAction({ itemId }) {
  return removeCartItem({ itemId });
}

export async function clearCartAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  return clearCartByToken(token);
}
```

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 6: Run build**

Run: `npm run build`
Expected: succeeds, sin cambios en la tabla de rutas

- [ ] **Step 7: Verificar manualmente en el navegador**

1. `npm run dev` si no está corriendo.
2. Ir a `/catalog`, agregar un producto al carrito.
   Expected: el `CartDrawer` se abre y muestra el item — comportamiento idéntico a antes del refactor.
3. Cambiar la cantidad de un item y quitarlo.
   Expected: el total se recalcula y el item desaparece, sin errores en consola.

- [ ] **Step 8: Commit**

```bash
git add lib/cart/cookie.js lib/cart/mutations.js lib/cart/server.js app/actions/cart.js
git commit -m "refactor(cart): extract cart mutation logic into a shared module"
```

---

### Task 2: API REST de carrito

**Files:**
- Create: `app/api/cart/route.js`
- Create: `app/api/cart/items/route.js`
- Create: `app/api/cart/items/[itemId]/route.js`

**Interfaces:**
- Consumes: `getCartByToken`, `getCartItemCartId` de `lib/cart/server.js`; `serializeCartRecord` de `lib/cart/serializer.js`; `setCartCookie` de `lib/cart/cookie.js`; `addItemToCart`, `updateCartItemQuantity`, `removeCartItem`, `clearCartByToken` de `lib/cart/mutations.js` (Task 1); `CART_COOKIE_NAME` de `lib/cart/constants.js`.
- Produces: rutas `GET/DELETE /api/cart`, `POST /api/cart/items`, `PATCH/DELETE /api/cart/items/[itemId]`.
- Sin test automático (route handlers son orquestación de red), se verifica con `curl` contra el servidor de dev.

- [ ] **Step 1: Ruta del carrito (`GET`, `DELETE`)**

Create `app/api/cart/route.js`:

```js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { serializeCartRecord } from "@/lib/cart/serializer";
import { getCartByToken } from "@/lib/cart/server";
import { clearCartByToken } from "@/lib/cart/mutations";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ cart: null });
  }

  try {
    const cart = await getCartByToken(token);
    return NextResponse.json({ cart: serializeCartRecord(cart) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  try {
    const cart = await clearCartByToken(token);
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Ruta para agregar items (`POST`)**

Create `app/api/cart/items/route.js`:

```js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { setCartCookie } from "@/lib/cart/cookie";
import { addItemToCart } from "@/lib/cart/mutations";

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  const variantId = payload?.variantId;
  const quantity = payload?.quantity;

  if (!variantId) {
    return NextResponse.json({ error: "variantId is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;

  try {
    const { cart, token: resolvedToken } = await addItemToCart({ token, variantId, quantity });
    if (resolvedToken !== token) {
      setCartCookie(cookieStore, resolvedToken);
    }
    return NextResponse.json({ cart }, { status: 201 });
  } catch (error) {
    const status = error.message === "Variante no encontrada" ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
```

- [ ] **Step 3: Ruta de un item (`PATCH`, `DELETE`)**

Create `app/api/cart/items/[itemId]/route.js`:

```js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CART_COOKIE_NAME } from "@/lib/cart/constants";
import { getCartByToken, getCartItemCartId } from "@/lib/cart/server";
import { removeCartItem, updateCartItemQuantity } from "@/lib/cart/mutations";

async function resolveOwnedItemCart(itemId) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cart = token ? await getCartByToken(token) : null;
  const itemCartId = await getCartItemCartId(itemId);

  if (!cart || !itemCartId || itemCartId !== cart.id) {
    return null;
  }

  return cart;
}

export async function PATCH(request, { params }) {
  const { itemId } = await params;
  const payload = await request.json().catch(() => null);
  const quantity = Number(payload?.quantity);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "quantity must be >= 1" }, { status: 400 });
  }

  const owned = await resolveOwnedItemCart(itemId);
  if (!owned) {
    return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  }

  try {
    const cart = await updateCartItemQuantity({ itemId, quantity });
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { itemId } = await params;

  const owned = await resolveOwnedItemCart(itemId);
  if (!owned) {
    return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  }

  try {
    const cart = await removeCartItem({ itemId });
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: ambos sin errores; la tabla de rutas de `npm run build` ahora incluye `/api/cart`, `/api/cart/items` y `/api/cart/items/[itemId]`.

- [ ] **Step 5: Verificar manualmente con `curl`**

Con el server de dev corriendo (`npm run dev`) y un `variantId` real (sacado de Supabase Studio → `product_variants`, o de la respuesta de `GET /api/products`):

```bash
curl -sc /tmp/cookies.txt -b /tmp/cookies.txt http://localhost:3000/api/cart
# Expected: {"cart":null}

curl -sc /tmp/cookies.txt -b /tmp/cookies.txt -X POST http://localhost:3000/api/cart/items \
  -H 'Content-Type: application/json' \
  -d '{"variantId":"<uuid-real>","quantity":2}'
# Expected: 201, { "cart": { "items": [ { "quantity": 2, ... } ], ... } }

curl -sc /tmp/cookies.txt -b /tmp/cookies.txt http://localhost:3000/api/cart
# Expected: mismo carrito, ahora con cookie ya seteada

curl -sc /tmp/cookies.txt -b /tmp/cookies.txt -X POST http://localhost:3000/api/cart/items \
  -H 'Content-Type: application/json' -d '{"variantId":"00000000-0000-0000-0000-000000000000"}'
# Expected: 400, {"error":"Variante no encontrada"}
```

Anotar el `itemId` devuelto en la respuesta del `POST` y probar:

```bash
curl -sc /tmp/cookies.txt -b /tmp/cookies.txt -X PATCH http://localhost:3000/api/cart/items/<itemId> \
  -H 'Content-Type: application/json' -d '{"quantity":5}'
# Expected: 200, cart con quantity: 5

curl -sc /tmp/cookies.txt -b /tmp/cookies.txt -X PATCH http://localhost:3000/api/cart/items/<itemId> \
  -H 'Content-Type: application/json' -d '{"quantity":0}'
# Expected: 400

curl -s -X PATCH http://localhost:3000/api/cart/items/<itemId> \
  -H 'Content-Type: application/json' -d '{"quantity":1}'
# (sin cookie) Expected: 404 — el item existe pero no pertenece a este carrito de invitado

curl -sc /tmp/cookies.txt -b /tmp/cookies.txt -X DELETE http://localhost:3000/api/cart/items/<itemId>
# Expected: 200, cart sin ese item

curl -sc /tmp/cookies.txt -b /tmp/cookies.txt -X DELETE http://localhost:3000/api/cart
# Expected: 200, cart vacío
```

- [ ] **Step 6: Commit**

```bash
git add app/api/cart
git commit -m "feat(cart): add REST API for cart and cart items"
```

---

### Task 3: API REST de órdenes (lectura)

**Files:**
- Modify: `lib/orders/server.js` (agrega `customer_id` a `ORDER_SELECT`, agrega `listOrdersByCustomer`)
- Create: `app/api/orders/route.js`
- Create: `app/api/orders/[id]/route.js`

**Interfaces:**
- Consumes: `requireCustomerSession()` de `lib/supabase/customer-auth.js` (ya existe, mergeado a `Main` en este mismo trabajo) — devuelve `{ session: { user }, error: null }` o `{ session: null, error: Error }`.
- Produces (`lib/orders/server.js`, agregado): `listOrdersByCustomer(customerId: string) -> Promise<Array<object>>` (órdenes ya serializadas, más recientes primero). `getOrderById` (existente) ahora también devuelve `customer_id` en el registro crudo — usado por la Tarea 6 para el gate de ownership de `/mis-pedidos/[id]`.
- Produces: rutas `GET /api/orders`, `GET /api/orders/[id]`.
- Sin test automático (orquestación de red), se verifica con `curl`.

- [ ] **Step 1: Agregar `customer_id` al select y la función de listado**

En `lib/orders/server.js`, modificar `ORDER_SELECT` agregando `customer_id` después de `cart_id`:

Old:
```js
export const ORDER_SELECT = `
  id,
  cart_id,
  order_number,
```

New:
```js
export const ORDER_SELECT = `
  id,
  cart_id,
  customer_id,
  order_number,
```

Agregar `listOrdersByCustomer` al final del archivo (después de `updateOrderFromMercadoPagoPayment`):

```js
export async function listOrdersByCustomer(customerId) {
  if (!customerId) return [];

  const { data, error } = await supabase()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(serializeOrderRecord);
}
```

- [ ] **Step 2: Ruta de listado (`GET /api/orders`)**

Create `app/api/orders/route.js`:

```js
import { NextResponse } from "next/server";
import { requireCustomerSession } from "@/lib/supabase/customer-auth";
import { listOrdersByCustomer } from "@/lib/orders/server";

export async function GET() {
  const { session, error } = await requireCustomerSession();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  try {
    const orders = await listOrdersByCustomer(session.user.id);
    return NextResponse.json({ orders });
  } catch (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Ruta de detalle (`GET /api/orders/[id]`)**

Create `app/api/orders/[id]/route.js`:

```js
import { NextResponse } from "next/server";
import { requireCustomerSession } from "@/lib/supabase/customer-auth";
import { getOrderById, serializeOrderRecord } from "@/lib/orders/server";

export async function GET(request, { params }) {
  const { session, error } = await requireCustomerSession();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const { id } = await params;

  let orderRecord;
  try {
    orderRecord = await getOrderById(id);
  } catch (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!orderRecord) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (orderRecord.customer_id !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({ order: serializeOrderRecord(orderRecord) });
}
```

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: ambos sin errores; la tabla de rutas incluye `/api/orders` y `/api/orders/[id]`.

- [ ] **Step 5: Verificar manualmente con `curl`**

```bash
curl -s http://localhost:3000/api/orders
# Expected: 401, {"error":"..."}
```

Con sesión (loguearse en el navegador en `/login`, copiar las cookies `sb-*` con las devtools o usar el mismo navegador):

1. Completar una compra de punta a punta (agregar al carrito, `/checkout`, pagar en sandbox de Mercado Pago).
2. Loguear con la misma cuenta y visitar `http://localhost:3000/api/orders` directo en el navegador.
   Expected: JSON con `{ "orders": [ { ... } ] }`, incluye la orden recién creada.
3. Visitar `http://localhost:3000/api/orders/<id-de-esa-orden>`.
   Expected: `{ "order": { ... } }`.
4. Loguear con otra cuenta y visitar la misma URL de detalle.
   Expected: `403`.

- [ ] **Step 6: Commit**

```bash
git add lib/orders/server.js app/api/orders
git commit -m "feat(orders): add read-only REST API for customer orders"
```

---

### Task 4: Extraer `OrderSummaryCard` y reusarlo en `checkout/success`

**Files:**
- Create: `components/OrderSummaryCard.jsx`
- Create: `components/OrderSummaryCard.module.css`
- Modify: `app/checkout/success/page.js`

**Interfaces:**
- Consumes: una orden serializada (forma de `serializeOrderRecord` en `lib/orders/server.js`): `{ number, paymentStatus, total, currency, items: [{ id, name, variantTitle, quantity, subtotal, currency }] }`.
- Produces: `OrderSummaryCard({ order }) -> JSX.Element` — renderiza el bloque de metadata (orden/estado/total) + lista de items. Se usa en `checkout/success` (esta tarea) y en `/mis-pedidos/[id]` (Tarea 6).

- [ ] **Step 1: Crear el componente**

Create `components/OrderSummaryCard.jsx`:

```jsx
import styles from "./OrderSummaryCard.module.css";

function formatPrice(value, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrderSummaryCard({ order }) {
  return (
    <>
      <div className={styles.resultMeta}>
        <div>
          <span>Orden</span>
          <strong>#{order.number}</strong>
        </div>
        <div>
          <span>Estado</span>
          <strong>{order.paymentStatus}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatPrice(order.total, order.currency)}</strong>
        </div>
      </div>

      <div className={styles.itemsList}>
        {order.items.map((item) => (
          <div key={item.id} className={styles.summaryItem}>
            <div>
              <p className={styles.summaryItemName}>{item.name}</p>
              <p className={styles.summaryItemMeta}>
                {item.variantTitle ?? "Único"} · {item.quantity} unidad{item.quantity > 1 ? "es" : ""}
              </p>
            </div>
            <strong>{formatPrice(item.subtotal, item.currency)}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Crear los estilos (copiados de `checkout.module.css`)**

Create `components/OrderSummaryCard.module.css`:

```css
.resultMeta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 24px 0 12px;
}

.resultMeta > div {
  padding: 18px;
  border-radius: var(--radius-md);
  background: var(--color-surface-alt);
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary);
}

.resultMeta strong {
  color: var(--color-text-primary);
}

.itemsList {
  display: grid;
  gap: 14px;
}

.summaryItem {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}

.summaryItem:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.summaryItemName {
  margin: 0;
  color: var(--color-text-primary);
  font-weight: 600;
}

.summaryItemMeta {
  margin: 6px 0 0;
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .resultMeta {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Usar el componente en `checkout/success`**

Replace the entire content of `app/checkout/success/page.js`:

```jsx
import Link from "next/link";
import OrderSummaryCard from "@/components/OrderSummaryCard";
import { getOrderById, serializeOrderRecord, updateOrderFromMercadoPagoPayment } from "@/lib/orders/server";
import styles from "../checkout.module.css";

export default async function CheckoutSuccessPage({ searchParams }) {
  const params = await searchParams;
  const paymentId = params?.payment_id ?? params?.collection_id ?? null;
  const orderId = params?.order_id ?? params?.external_reference ?? null;

  const orderRecord = paymentId
    ? await updateOrderFromMercadoPagoPayment(String(paymentId))
    : await getOrderById(orderId);
  const order = serializeOrderRecord(orderRecord);

  return (
    <main className={styles.page}>
      <section className={styles.resultCard}>
        <p className={styles.kicker}>Pago recibido</p>
        <h1 className={styles.pageTitle}>Tu compra fue registrada</h1>
        <p className={styles.pageIntro}>
          {order?.paymentStatus === "paid"
            ? "Mercado Pago confirmó el pago y ya estamos preparando tu pedido."
            : "Recibimos tu operación. Si el pago todavía se está confirmando, lo vamos a actualizar automáticamente."}
        </p>

        {order ? <OrderSummaryCard order={order} /> : null}

        <div className={styles.resultActions}>
          <Link href="/catalog" className={styles.primaryButton}>
            Seguir comprando
          </Link>
          <a
            href="https://wa.me/541139205184"
            className={styles.secondaryButton}
            target="_blank"
            rel="noopener noreferrer"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: ambos sin errores.

- [ ] **Step 5: Verificar manualmente**

1. Completar una compra en sandbox de punta a punta hasta `/checkout/success`.
   Expected: la página se ve idéntica a antes del refactor (mismo layout, mismos datos).
2. Resize a 375px.
   Expected: el grid de metadata pasa a una columna, sin overflow (mismo comportamiento que ya tenía `checkout.module.css`).

- [ ] **Step 6: Commit**

```bash
git add components/OrderSummaryCard.jsx components/OrderSummaryCard.module.css app/checkout/success/page.js
git commit -m "refactor(checkout): extract OrderSummaryCard component"
```

---

### Task 5: Página "Mis pedidos" (listado) + link en el header

**Files:**
- Create: `app/mis-pedidos/page.js`
- Create: `app/mis-pedidos/mis-pedidos.module.css`
- Modify: `components/AccountMenu.jsx`
- Modify: `components/AccountMenu.module.css`

**Interfaces:**
- Consumes: `getCustomerSession()` de `lib/supabase/customer-auth.js` (existente); `listOrdersByCustomer` de `lib/orders/server.js` (Tarea 3).
- Produces: ruta `/mis-pedidos`; link "Mis pedidos" en `AccountMenu` visible solo con sesión.

- [ ] **Step 1: Crear la página de listado**

Create `app/mis-pedidos/page.js`:

```jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/supabase/customer-auth";
import { listOrdersByCustomer } from "@/lib/orders/server";
import styles from "./mis-pedidos.module.css";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value));
}

function formatPrice(value, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export const metadata = {
  title: "Mis pedidos | Sleep",
};

export default async function MisPedidosPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/login?next=/mis-pedidos");
  }

  const orders = await listOrdersByCustomer(session.user.id);

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <p className={styles.kicker}>Tu cuenta</p>
        <h1 className={styles.pageTitle}>Mis pedidos</h1>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Todavía no hiciste ningún pedido.</p>
            <Link href="/catalog" className={styles.primaryButton}>
              Ver catálogo
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {orders.map((order) => (
              <li key={order.id} className={styles.card}>
                <Link href={`/mis-pedidos/${order.id}`} className={styles.cardLink}>
                  <div>
                    <p className={styles.cardNumber}>Orden #{order.number}</p>
                    <p className={styles.cardDate}>{formatDate(order.placedAt)}</p>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardStatus}>{order.paymentStatus}</span>
                    <strong>{formatPrice(order.total, order.currency)}</strong>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Crear los estilos**

Create `app/mis-pedidos/mis-pedidos.module.css`:

```css
.page {
  min-height: calc(100vh - 64px);
  padding: 32px 24px 64px;
  background: var(--color-surface);
}

.layout {
  max-width: 720px;
  margin: 0 auto;
}

.kicker {
  margin: 0 0 8px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.pageTitle {
  margin: 0 0 24px;
  font-size: 1.875rem;
  line-height: 1.2;
  color: var(--color-primary);
}

.emptyState {
  padding: 48px 32px;
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: grid;
  gap: 20px;
  justify-items: center;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.cardLink {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  color: inherit;
  text-decoration: none;
}

.cardLink:hover,
.cardLink:focus-visible {
  background: var(--color-surface-alt);
  outline: none;
}

.cardNumber {
  margin: 0;
  font-weight: 600;
  color: var(--color-text-primary);
}

.cardDate {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.cardMeta {
  display: grid;
  gap: 6px;
  text-align: right;
  color: var(--color-text-secondary);
}

.cardStatus {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.primaryButton {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 48px;
  padding: 0 22px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--color-accent);
  color: var(--color-surface);
  font-weight: 600;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 640px) {
  .page {
    padding: 24px 16px 48px;
  }

  .cardLink {
    flex-direction: column;
    align-items: flex-start;
  }

  .cardMeta {
    text-align: left;
  }
}
```

- [ ] **Step 3: Agregar el link "Mis pedidos" en `AccountMenu`**

En `components/AccountMenu.jsx`, reemplazar el bloque de retorno con sesión activa:

Old:
```jsx
  return (
    <div className={styles.menu}>
      <span className={styles.greeting}>Hola, {displayName}</span>
      <button type="button" className={styles.logout} onClick={handleLogout}>
        Salir
      </button>
    </div>
  );
```

New:
```jsx
  return (
    <div className={styles.menu}>
      <span className={styles.greeting}>Hola, {displayName}</span>
      <Link href="/mis-pedidos" className={styles.link}>
        Mis pedidos
      </Link>
      <button type="button" className={styles.logout} onClick={handleLogout}>
        Salir
      </button>
    </div>
  );
```

- [ ] **Step 4: Evitar overflow del header con el link nuevo**

En `components/AccountMenu.module.css`, modificar `.menu` para que haga wrap en vez de desbordar:

Old:
```css
.menu {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
```

New:
```css
.menu {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-sm);
}
```

- [ ] **Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: ambos sin errores; la tabla de rutas incluye `/mis-pedidos`.

- [ ] **Step 6: Verificar manualmente en el navegador**

1. Sin sesión, visitar `http://localhost:3000/mis-pedidos`.
   Expected: redirige a `/login?next=/mis-pedidos`.
2. Loguear con una cuenta sin compras.
   Expected: estado vacío "Todavía no hiciste ningún pedido." con link a `/catalog`.
3. Loguear con la cuenta que completó una compra en la Tarea 3.
   Expected: aparece una tarjeta con número de orden, fecha, estado y total.
4. En el header, con sesión iniciada, confirmar que aparece "Mis pedidos" junto a "Salir".
5. Resize a 375px, 768px, 1024px y 1440px.
   Expected: sin overflow horizontal en el header ni en la lista; a 375px las tarjetas de pedido apilan verticalmente.

- [ ] **Step 7: Commit**

```bash
git add app/mis-pedidos/page.js app/mis-pedidos/mis-pedidos.module.css components/AccountMenu.jsx components/AccountMenu.module.css
git commit -m "feat(orders): add Mis pedidos list page and header link"
```

---

### Task 6: Página "Mis pedidos" (detalle)

**Files:**
- Create: `app/mis-pedidos/[id]/page.js`

**Interfaces:**
- Consumes: `getCustomerSession()` de `lib/supabase/customer-auth.js`; `getOrderById`, `serializeOrderRecord` de `lib/orders/server.js` (el registro crudo ahora trae `customer_id`, Tarea 3); `OrderSummaryCard` de `components/OrderSummaryCard.jsx` (Tarea 4); estilos de `app/checkout/checkout.module.css` (reusados, mismo patrón que `checkout/success|pending|failure`).

- [ ] **Step 1: Crear la página de detalle**

Create `app/mis-pedidos/[id]/page.js`:

```jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import OrderSummaryCard from "@/components/OrderSummaryCard";
import { getCustomerSession } from "@/lib/supabase/customer-auth";
import { getOrderById, serializeOrderRecord } from "@/lib/orders/server";
import styles from "@/app/checkout/checkout.module.css";

export const metadata = {
  title: "Detalle de pedido | Sleep",
};

export default async function MiPedidoDetailPage({ params }) {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/login?next=/mis-pedidos");
  }

  const { id } = await params;
  const orderRecord = await getOrderById(id);

  if (!orderRecord || orderRecord.customer_id !== session.user.id) {
    notFound();
  }

  const order = serializeOrderRecord(orderRecord);

  return (
    <main className={styles.page}>
      <section className={styles.resultCard}>
        <p className={styles.kicker}>Mis pedidos</p>
        <h1 className={styles.pageTitle}>Orden #{order.number}</h1>
        <p className={styles.pageIntro}>Detalle de tu compra.</p>

        <OrderSummaryCard order={order} />

        <div className={styles.resultActions}>
          <Link href="/mis-pedidos" className={styles.secondaryButton}>
            Volver a mis pedidos
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: ambos sin errores; la tabla de rutas incluye `/mis-pedidos/[id]`.

- [ ] **Step 3: Verificar manualmente en el navegador**

1. Loguear con la cuenta que tiene la orden de la Tarea 3, ir a `/mis-pedidos` y hacer clic en la tarjeta.
   Expected: `/mis-pedidos/<id>` muestra el mismo bloque de metadata/items que `checkout/success` para esa orden.
2. Copiar esa URL, loguear con otra cuenta y visitarla directo.
   Expected: página 404 de Next.js (no un mensaje de error de API).
3. Sin sesión, visitar la misma URL.
   Expected: redirige a `/login?next=/mis-pedidos`.
4. Resize a 375px y 1440px.
   Expected: mismo comportamiento responsive ya verificado para `checkout.module.css` en `checkout/success`.

- [ ] **Step 4: Commit**

```bash
git add app/mis-pedidos/\[id\]/page.js
git commit -m "feat(orders): add Mis pedidos order detail page"
```

---

### Task 7: Documentación y verificación final

**Files:**
- Modify: `README.md`

**Interfaces:** Ninguna — esta tarea solo documenta y verifica el trabajo de las Tareas 1–6.

- [ ] **Step 1: Documentar la API de carrito/órdenes**

En `README.md`, agregar una sección nueva después de `## API interna` (antes de `## Configuración de Mercado Pago`):

```markdown
## API de carrito y órdenes

- `GET /api/cart`: carrito actual según la cookie de invitado. Devuelve
  `{ cart: null }` si todavía no hay cookie (no crea un carrito vacío).
- `DELETE /api/cart`: vacía el carrito actual.
- `POST /api/cart/items`: agrega un item `{ variantId, quantity? }`.
- `PATCH /api/cart/items/:itemId`: cambia la cantidad `{ quantity }`.
- `DELETE /api/cart/items/:itemId`: quita un item.
- `GET /api/orders`: pedidos del cliente logueado. Requiere sesión (`401`
  sin ella).
- `GET /api/orders/:id`: detalle de un pedido propio (`403` si es de otro
  cliente, `404` si no existe).
```

- [ ] **Step 2: Documentar "Mis pedidos" bajo "Cuentas de cliente"**

En `README.md`, dentro de la sección `## Cuentas de cliente`, agregar una línea después de la que menciona el checkout:

Old:
```markdown
- Al completar una compra, la orden y el carrito quedan asociados al
  `customer_id` del usuario logueado.
```

New:
```markdown
- Al completar una compra, la orden y el carrito quedan asociados al
  `customer_id` del usuario logueado.
- `GET /mis-pedidos`: lista los pedidos del cliente logueado; `GET
  /mis-pedidos/:id` el detalle de uno propio. Redirige a
  `/login?next=/mis-pedidos` sin sesión.
```

- [ ] **Step 3: Correr la suite completa de verificación**

```bash
npm run lint
node --test
npm run build
```

Expected: los tres comandos terminan sin errores.

- [ ] **Step 4: Checklist manual de punta a punta**

- [ ] `GET /api/cart` sin cookie devuelve `{ cart: null }`.
- [ ] `POST /api/cart/items` → `PATCH` → `DELETE` en `/api/cart/items/:itemId` funcionan con `curl`, y el carrito resultante coincide con lo que muestra el `CartDrawer` en el navegador (misma cookie).
- [ ] `GET /api/orders` y `GET /api/orders/:id` devuelven `401` sin sesión, `403` en una orden ajena, `200` con los datos correctos en una propia.
- [ ] `/mis-pedidos` lista las órdenes del cliente logueado y redirige a login sin sesión.
- [ ] `/mis-pedidos/:id` muestra el detalle correcto, da 404 en una orden ajena.
- [ ] El header muestra "Mis pedidos" solo con sesión iniciada, sin overflow a 375/768/1024/1440px.
- [ ] `CartContext` y `CheckoutForm` siguen funcionando exactamente igual que antes de este trabajo (server actions intactas).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document cart/orders REST API and Mis pedidos"
```
