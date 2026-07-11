# Sleep E-commerce

## Requisitos

- Node.js `>= 20.9.0`
- Supabase configurado con el schema de `supabase/schema.sql`
- Credenciales de Mercado Pago Checkout Pro

## Variables de entorno

Usá `.env.local.example` como base y completá:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`

## Desarrollo

```bash
npm install
npm run dev
```

## Flujo de checkout implementado

- `GET /checkout`: formulario de comprador + resumen del carrito
- `POST` server action `createCheckoutPreferenceAction`: crea `orders`, `order_items`, `payments` y la preferencia de Mercado Pago
- `POST /api/payments/mercadopago/webhook`: sincroniza pagos desde Mercado Pago y actualiza `orders/payments/carts`
- `GET /checkout/success|pending|failure`: páginas de retorno para el usuario

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

## Cuentas de cliente

- `GET /registro`: alta de cuenta con nombre, email y código OTP por email vía
  Supabase Auth. Crea también la fila correspondiente en `public.customers`.
- `GET /login`: login con código OTP por email. Acepta `?next=<path>` para
  volver a donde el usuario venía después de loguearse (usado por el checkout).
- El checkout (`/checkout`) requiere sesión iniciada; si no hay sesión,
  redirige a `/login?next=/checkout`.
- Al completar una compra, la orden y el carrito quedan asociados al
  `customer_id` del usuario logueado.
- `GET /mis-pedidos`: lista los pedidos del cliente logueado; `GET
  /mis-pedidos/:id` el detalle de uno propio. Redirige a
  `/login?next=/mis-pedidos` sin sesión.

**Nota:** para que el login sea por código y no por magic link, en Supabase
Authentication → Email Templates → Magic Link el template debe incluir
`{{ .Token }}`. El OTP por email mantiene los límites de Supabase Auth: por
defecto, un reenvío al mismo usuario queda bloqueado durante 60 segundos.

## API interna

- `GET /api/products`: catálogo público activo (usado por home y `/catalog`
  a través de la misma función de servicio, sin round-trip HTTP interno).
- `GET/POST /api/admin/products` y `GET/PATCH/DELETE /api/admin/products/:id`:
  CRUD de productos, requiere sesión de admin (`401` sin ella).

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

## Configuración de Mercado Pago

- En Checkout Pro, configurá como `notification_url` pública:
  `https://tu-dominio.com/api/payments/mercadopago/webhook`
- Las `back_urls` ya las genera la app apuntando a `/checkout/success`, `/checkout/pending` y `/checkout/failure`.

## Base de datos

Aplicá el schema de Supabase antes de probar compras:

```bash
supabase db reset --file supabase/schema.sql
```
