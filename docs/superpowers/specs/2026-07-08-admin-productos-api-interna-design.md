# Panel de admin (Productos) + API interna del catálogo

## Contexto

La corrección de la cátedra señaló, entre otros puntos, que el proyecto no tiene
API interna (E4) y que el CRUD de Supabase no tiene un admin funcional (E5). El
schema de Supabase (`supabase/schema.sql`) ya modela todo lo necesario para un
admin real vía Supabase Auth (tabla `admin_users`, función `is_admin()`, RLS en
cada tabla), pero esa capa nunca se conectó a una interfaz. Este documento cubre
dos entregables relacionados:

1. Una API interna (`/api/products`, `/api/admin/products`) que además pasa a
   ser la fuente de datos del catálogo público (home y `/catalog`).
2. Un panel de admin mínimo (`/admin`) con login y CRUD completo de productos
   y variantes.

**Fuera de alcance de este spec** (quedan para pasadas futuras, ya acordadas
con el usuario): gestión de órdenes en el admin, workflow de PRs/ramas, fix del
error de rutas en el pago de producción, validación en vivo por campo del
checkout, y visibilidad de la barra de búsqueda en el Navbar.

## Arquitectura

### Autenticación de admin

- Reutiliza `@supabase/ssr` (ya es dependencia) para manejar sesión vía
  cookies con `createServerClient` / `createBrowserClient`.
- `app/admin/layout.js` (server component) lee la sesión, verifica que el
  `user.id` tenga fila en `admin_users` (vía service role, para no depender de
  que la RLS del cliente ya esté bien propagada) y redirige a `/admin/login`
  si no hay sesión o no es admin.
- `app/admin/login/page.js` — formulario cliente con
  `supabase.auth.signInWithPassword({ email, password })` usando
  `getSupabaseBrowserClient()`; si el login es exitoso, redirige a
  `/admin/productos`.
- No se agrega `middleware.js` global: el chequeo vive en el layout de
  `/admin`, que es el único árbol de rutas protegido. Mantiene el blast radius
  acotado y no toca el resto del ruteo público.
- El primer usuario admin se crea a mano (Supabase Studio: Authentication →
  crear usuario, y luego insertar su `id` en `admin_users`). Se documenta el
  paso en el README — no se automatiza con un seed porque requeriría exponer
  una contraseña por defecto.

### API interna

Capa de servicio compartida en `lib/products/admin-service.js` con las
funciones de consulta/mutación sobre `products` y `product_variants` vía
`getSupabaseServiceRole()`. Los route handlers son capas finas sobre esa
función; las páginas SSR públicas la llaman directo (sin salto de red) para
evitar el anti-patrón de que el servidor se haga fetch a sí mismo.

| Ruta | Método | Auth | Uso |
|---|---|---|---|
| `/api/products` | GET | pública | Home y `/catalog` (vía llamada directa server-side) y cualquier cliente externo que quiera el catálogo activo |
| `/api/admin/products` | GET | admin | Listado completo del panel (incluye `draft`/`archived`) |
| `/api/admin/products` | POST | admin | Alta de producto (con variantes iniciales opcionales) |
| `/api/admin/products/[id]` | GET | admin | Detalle para el formulario de edición |
| `/api/admin/products/[id]` | PATCH | admin | Edición de producto + reemplazo de su set de variantes en la misma request |
| `/api/admin/products/[id]` | DELETE | admin | Baja del producto (cascada a variantes por FK) |

Las rutas `/api/admin/*` llaman a un helper `requireAdmin()` al principio de
cada handler; si falla, devuelven `401`. Toda mutación valida el payload con
Zod (mismo patrón que `app/actions/checkout.js`) y devuelve `400` con el
primer mensaje de error si falla.

`GET /api/products` devuelve la misma forma de datos que hoy consume
`mapSupabaseProductToCardData`, para no tocar los componentes de presentación
del catálogo.

### Migración del catálogo público a la API interna

- `app/page.js` y `app/catalog/page.js` dejan de llamar
  `getCatalogProducts` directo desde `lib/supabase/queries/products.js` y
  pasan a llamar la función de servicio compartida (la misma que usa el route
  handler de `/api/products`). El fallback a `data/products.js` ante error se
  mantiene igual que hoy.
- `lib/supabase/queries/products.js` no se borra: `getProductBySlug` (usado en
  la PDP) sigue como está, fuera de este alcance.

### Panel de admin — pantallas

- `/admin/productos` (client component): al montar, hace
  `fetch('/api/admin/products')`, muestra tabla (nombre, slug, estado, precio
  base, stock total) con botón "Nuevo producto" y link "Editar" por fila.
- `/admin/productos/nuevo` y `/admin/productos/[id]`: mismo componente de
  formulario reutilizado (`AdminProductForm`), con:
  - Campos del producto: nombre, slug, descripción corta/larga, estado
    (draft/active/archived), destacado.
  - Sub-lista editable de variantes: título, SKU, precio, precio comparado,
    stock — agregar/quitar filas en el cliente antes de guardar.
  - Validación Zod compartida entre cliente (mensajes inline por campo,
    corrigiendo la falla de "solo valida el mail" que señaló la corrección
    en el checkout, sin tocar el checkout en este spec) y servidor (misma
    fuente de verdad, evita divergencia).
  - Submit hace `fetch` con `POST`/`PATCH` a la API; maneja estados
    `idle | saving | error` y muestra el mensaje de error devuelto por la API.
  - Botón "Eliminar" en la pantalla de edición, con confirmación simple
    (`window.confirm`) antes de `DELETE`.

## Manejo de errores

- Cliente Supabase no disponible / error de red → la API devuelve `500` con
  `{ error: message }`; el formulario muestra un banner de error genérico y
  no pierde los datos ingresados.
- Sesión vencida durante una edición → `401` de la API se traduce en el
  cliente a "Tu sesión expiró, iniciá sesión de nuevo" con link a
  `/admin/login`.
- Slug duplicado (constraint UNIQUE) → la API traduce el error de Postgres a
  un mensaje de campo (`slug: "Ya existe un producto con ese slug"`).

## Testing

- Unit tests (`node --test`, como ya hace el proyecto) para la capa de
  servicio: mapeo de payload → filas de `products`/`product_variants`, y
  validación Zod (casos válidos e inválidos).
- No se agregan tests end-to-end nuevos en este spec; se verifica manualmente
  el flujo login → crear → editar → borrar antes de dar por cerrado el punto,
  como indica AGENTS.md ("ejecutar lint, tests y build después de cada cambio
  relevante").

## Documentación

- README: sección nueva "Panel de admin" con el paso manual para crear el
  primer usuario admin, y las variables de entorno ya existentes que hacen
  falta (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
