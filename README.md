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

## API interna

- `GET /api/products`: catálogo público activo (usado por home y `/catalog`
  a través de la misma función de servicio, sin round-trip HTTP interno).
- `GET/POST /api/admin/products` y `GET/PATCH/DELETE /api/admin/products/:id`:
  CRUD de productos, requiere sesión de admin (`401` sin ella).

## Configuración de Mercado Pago

- En Checkout Pro, configurá como `notification_url` pública:
  `https://tu-dominio.com/api/payments/mercadopago/webhook`
- Las `back_urls` ya las genera la app apuntando a `/checkout/success`, `/checkout/pending` y `/checkout/failure`.

## Base de datos

Aplicá el schema de Supabase antes de probar compras:

```bash
supabase db reset --file supabase/schema.sql
```
