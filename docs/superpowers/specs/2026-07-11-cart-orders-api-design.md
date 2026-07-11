# API REST de carrito/órdenes + "Mis pedidos"

## Contexto

El catálogo ya tiene una API interna (`/api/products`, `/api/admin/products`,
spec del 2026-07-08). El carrito y el checkout, en cambio, funcionan hoy
100% con server actions de Next.js (`app/actions/cart.js`,
`app/actions/checkout.js`), consumidas por `CartContext` y `CheckoutForm`.
No existe ninguna ruta HTTP para carrito ni para órdenes.

El spec de auth de clientes (2026-07-10) dejó pendiente la página "Mis
pedidos" explícitamente para "el spec de APIs de carrito/órdenes que sigue
después de este" — este documento cierra esa brecha y agrega, además, el
entregable de API REST para carrito/órdenes que pide el cronograma de la
cátedra.

**Decisiones confirmadas con el usuario:**

- Se incluye la página "Mis pedidos" en esta misma pasada (no se pospone de
  nuevo).
- La API REST se agrega como una **capa adicional**, del mismo modo que
  `/api/products`: las server actions existentes (`CartContext`,
  `CheckoutForm`) siguen funcionando sin cambios; las páginas nuevas
  (`/mis-pedidos`) llaman a la capa de servicio compartida directo,
  server-side, sin auto-fetchear su propia API (mismo criterio que el
  catálogo). Los endpoints nuevos existen para consumo externo/testing
  (`curl`, Postman) y para satisfacer el entregable de API REST del
  cronograma.

**Fuera de alcance de este spec** (quedan para pasadas futuras): gestión de
órdenes en el panel de admin (crear/editar/cancelar), creación de orden vía
API (se mantiene exclusivamente en `createCheckoutPreferenceAction` por su
acoplamiento con la preferencia de Mercado Pago), migración del frontend de
carrito/checkout a fetch sobre la nueva API, paginación de "Mis pedidos"
(la lista completa alcanza para el volumen de datos de un trabajo de
cátedra), y el fix del error de rutas del pago en producción (bug
distinto, ya señalado como pendiente).

## Arquitectura

### Refactor previo: extraer la lógica de mutación del carrito

`app/actions/cart.js` hoy tiene toda la lógica de agregar/actualizar/quitar
items inline en cada server action. Para que las rutas REST y las server
actions compartan la misma lógica sin duplicarla, esa lógica se extrae a
`lib/cart/mutations.js`:

- `ensureCartWithToken(token)`, `addItemToCart({ cartId, variantId,
  quantity })`, `updateCartItemQuantity({ itemId, quantity })`,
  `removeCartItem({ itemId })`, `clearCart({ cartId })`.
- `app/actions/cart.js` pasa a ser una capa fina sobre estas funciones
  (igual patrón que ya usa `app/api/admin/products/route.js` sobre
  `lib/products/admin-service.js`), manejando solo cookies y
  `revalidatePath`.
- Sin cambio de comportamiento observable: mismo flujo, misma forma de
  datos, mismos server actions públicos que ya consume `CartContext`.

### API REST de carrito

Auth: cookie de invitado (`CART_COOKIE_NAME`), igual que hoy. Si no hay
cookie, `GET /api/cart` devuelve `{ cart: null }` (200) en vez de crear un
carrito — crear carritos vacíos vía GET sería un efecto secundario
inesperado en un método idempotente. Las rutas de mutación si crean el
carrito si hace falta (mismo comportamiento que `ensureCartWithToken` hoy).

| Ruta | Método | Body | Respuesta |
|---|---|---|---|
| `/api/cart` | GET | — | `{ cart }` o `{ cart: null }` |
| `/api/cart` | DELETE | — | `{ cart }` (vaciado) |
| `/api/cart/items` | POST | `{ variantId, quantity? }` | `{ cart }` (201) |
| `/api/cart/items/[itemId]` | PATCH | `{ quantity }` | `{ cart }` |
| `/api/cart/items/[itemId]` | DELETE | — | `{ cart }` |

Todas devuelven el carrito serializado completo (`serializeCartRecord`),
igual que las server actions hoy — simplifica el cliente, que no necesita
volver a pedir el carrito tras cada mutación.

### API REST de órdenes

Auth: sesión de cliente (`requireCustomerSession()` de
`lib/supabase/customer-auth.js`). Solo lectura — la creación de orden sigue
atada al flujo de checkout con Mercado Pago y no se duplica acá.

| Ruta | Método | Auth | Respuesta |
|---|---|---|---|
| `/api/orders` | GET | cliente | `{ orders: [...] }` — solo las del `customer_id` de la sesión, más recientes primero |
| `/api/orders/[id]` | GET | cliente, dueño | `{ order }` — 403 si la orden existe pero es de otro cliente, 404 si no existe |

Nueva función `listOrdersByCustomer(customerId)` en `lib/orders/server.js`
(mismo archivo que ya tiene `getOrderById`/`serializeOrderRecord`), usando
`getSupabaseServiceRole()` + filtro explícito `customer_id = customerId`
(mismo criterio que el admin: no depender de que la RLS del cliente
anon-key ya esté bien propagada). `GET /api/orders/[id]` reusa
`getOrderById` y compara `order.customer_id` contra `session.user.id`
antes de devolver — si no coincide, `403`.

### Página "Mis pedidos"

- **`/mis-pedidos`** (Server Component, mismo patrón que
  `app/checkout/page.js`): `const session = await getCustomerSession();`
  — si es `null`, `redirect('/login?next=/mis-pedidos')`. Llama
  `listOrdersByCustomer(session.user.id)` directo (no fetch a su propia
  API). Lista tarjetas: número de orden, fecha (`placedAt`), estado
  (`status`/`paymentStatus`), total, link a `/mis-pedidos/[id]`. Estado
  vacío ("Todavía no hiciste ningún pedido" + link a `/catalog`) si la
  lista viene vacía.
- **`/mis-pedidos/[id]`**: mismo gate de sesión. Llama `getOrderById(id)`
  directo; si `order.customer_id !== session.user.id` o no existe, `notFound()`
  (Next.js 404). Reutiliza el layout/estilos de `app/checkout/success/page.js`
  (número, estado, lista de items, totales) extraídos a un componente
  compartido `components/OrderSummaryCard.jsx` para no duplicar el JSX ni el
  CSS entre `checkout/success` y `mis-pedidos/[id]`.
- **`AccountMenu`**: agrega un link "Mis pedidos" junto a "Salir" cuando hay
  sesión.

## Manejo de errores

- `/api/cart/items` sin `variantId`, o `variantId` que no existe en
  `product_variants` → `400 { error }`.
- `/api/cart/items/[itemId]` con `quantity < 1` → `400 { error }`.
- `itemId` que no pertenece al carrito de la cookie actual → `404 { error }`
  (evita que alguien mute items de un carrito ajeno adivinando UUIDs).
- `/api/orders*` sin sesión → `401 { error }` (mismo criterio que
  `requireAdminSession`).
- `/api/orders/[id]` de otro cliente → `403 { error }`; inexistente →
  `404 { error }`.
- Fallo de Supabase en cualquier ruta → `500 { error: message }`, mismo
  formato que `/api/admin/products`.
- `/mis-pedidos/[id]` con orden ajena o inexistente → 404 de Next.js
  (`notFound()`), no un mensaje de error — es una página, no una API.

## Testing

- Unit tests (`node --test`) para `lib/cart/mutations.js` donde sea
  practicable sin mockear todo Supabase (validación de `quantity`,
  normalización de inputs) — igual criterio que el resto del proyecto: si
  la función solo orquesta llamadas de red a Supabase, no se le agrega test
  unitario (como ya pasa con `admin-service.js` y `cart/server.js`).
- Unit test para `listOrdersByCustomer`/el filtro de ownership si la lógica
  de comparación se puede aislar sin red.
- Verificación manual (documentada en el README, sección nueva): `curl` a
  cada ruta nueva con y sin cookie/sesión válida, confirmando los códigos
  de estado de la tabla de arriba.
- Verificación manual en preview: agregar item vía `/api/cart/items` con
  `curl` y confirmar que aparece en el `CartDrawer` (prueba de que ambas
  capas comparten el mismo carrito); completar una compra, entrar a
  `/mis-pedidos` logueado y ver la orden; entrar a `/mis-pedidos/[id]` de
  otra cuenta y confirmar 404.

## Documentación

- README: nueva sección "API de carrito y órdenes" (mismo formato de tabla
  que "API interna") después de esa sección existente.
- README: bajo "Cuentas de cliente", agregar la línea de `/mis-pedidos` y
  el link en el header.
